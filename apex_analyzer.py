"""
Apex Code Analyzer - Detects violations in Salesforce Apex code.
"""

import os
import re
from typing import List, Dict
from rules import RULES, detect_cognitive_complexity

class Violation:
    """Represents a single code violation."""
    
    def __init__(self, rule_name, severity, file_path, line_number, column, description, code_snippet=""):
        self.rule_name = rule_name
        self.severity = severity
        self.file_path = file_path
        self.line_number = line_number
        self.column = column
        self.description = description
        self.code_snippet = code_snippet
        self.fixed = False
        self.fix_description = ""
    
    def __repr__(self):
        return f"Violation({self.rule_name}, {self.file_path}:{self.line_number})"
    
    def to_dict(self):
        """Convert to dictionary for reporting."""
        return {
            'rule_name': self.rule_name,
            'severity': self.severity,
            'file_path': self.file_path,
            'line_number': self.line_number,
            'column': self.column,
            'description': self.description,
            'code_snippet': self.code_snippet,
            'fixed': self.fixed,
            'fix_description': self.fix_description
        }

class ApexAnalyzer:
    """Main analyzer class for scanning Apex files."""
    
    def __init__(self, directory_path):
        self.directory_path = directory_path
        self.violations = []
        self.files_scanned = 0
    
    def scan_directory(self):
        """Scan all .cls files in the directory."""
        print(f"Scanning directory: {self.directory_path}")
        
        if not os.path.exists(self.directory_path):
            print(f"Error: Directory {self.directory_path} does not exist")
            return
        
        for root, dirs, files in os.walk(self.directory_path):
            for file in files:
                if file.endswith('.cls'):
                    file_path = os.path.join(root, file)
                    self.scan_file(file_path)
        
        print(f"Scanned {self.files_scanned} file(s), found {len(self.violations)} violation(s)")
    
    def scan_file(self, file_path):
        """Scan a single Apex file for violations."""
        print(f"  Scanning: {file_path}")
        self.files_scanned += 1
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check each rule
            for rule_name, rule in RULES.items():
                if rule_name == "CognitiveComplexity":
                    # Special handling for cognitive complexity
                    self._check_cognitive_complexity(file_path, content, rule)
                elif rule_name == "ApexSharingViolation":
                    # Special handling for sharing violations
                    self._check_sharing_violation(file_path, content, rule)
                elif rule.pattern:
                    # Standard pattern matching
                    self._check_pattern(file_path, content, rule)
        
        except Exception as e:
            print(f"  Error scanning {file_path}: {e}")
    
    def _check_pattern(self, file_path, content, rule):
        """Check for violations using regex pattern."""
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            matches = rule.pattern.finditer(line)
            for match in matches:
                # Skip if it's in a comment
                if self._is_in_comment(line, match.start()):
                    continue
                
                violation = Violation(
                    rule_name=rule.name,
                    severity=rule.severity,
                    file_path=file_path,
                    line_number=line_num,
                    column=match.start() + 1,
                    description=rule.description,
                    code_snippet=line.strip()
                )
                self.violations.append(violation)
    
    def _check_sharing_violation(self, file_path, content, rule):
        """Check for missing sharing declarations in classes."""
        lines = content.split('\n')
        
        # Look for class declarations
        class_pattern = re.compile(
            r'^\s*(public|global)\s+(class|abstract\s+class|virtual\s+class)\s+(\w+)',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            match = class_pattern.search(line)
            if match:
                # Check if sharing keyword is present in this line or nearby lines
                context = '\n'.join(lines[max(0, line_num-2):min(len(lines), line_num+1)])
                if not re.search(r'\b(with|without|inherited)\s+sharing\b', context, re.IGNORECASE):
                    violation = Violation(
                        rule_name=rule.name,
                        severity=rule.severity,
                        file_path=file_path,
                        line_number=line_num,
                        column=match.start() + 1,
                        description=rule.description,
                        code_snippet=line.strip()
                    )
                    self.violations.append(violation)
    
    def _check_cognitive_complexity(self, file_path, content, rule):
        """Check for high cognitive complexity in methods."""
        complexity_violations = detect_cognitive_complexity(content)
        
        for line_num, complexity in complexity_violations:
            violation = Violation(
                rule_name=rule.name,
                severity=rule.severity,
                file_path=file_path,
                line_number=line_num,
                column=1,
                description=f"{rule.description} (complexity: {complexity})",
                code_snippet=f"Method has complexity score of {complexity}"
            )
            self.violations.append(violation)
    
    def _is_in_comment(self, line, position):
        """Check if a position in a line is within a comment."""
        # Check for single-line comment
        comment_pos = line.find('//')
        if comment_pos != -1 and comment_pos < position:
            return True
        
        # Check for multi-line comment (simplified)
        if '/*' in line[:position] and '*/' not in line[:position]:
            return True
        
        return False
    
    def get_violations_by_file(self):
        """Group violations by file."""
        by_file = {}
        for v in self.violations:
            if v.file_path not in by_file:
                by_file[v.file_path] = []
            by_file[v.file_path].append(v)
        return by_file
    
    def get_violations_by_rule(self):
        """Group violations by rule."""
        by_rule = {}
        for v in self.violations:
            if v.rule_name not in by_rule:
                by_rule[v.rule_name] = []
            by_rule[v.rule_name].append(v)
        return by_rule
    
    def get_statistics(self):
        """Get summary statistics."""
        return {
            'total_files': self.files_scanned,
            'total_violations': len(self.violations),
            'violations_by_severity': self._count_by_severity(),
            'violations_by_rule': {rule: len(viols) for rule, viols in self.get_violations_by_rule().items()}
        }
    
    def _count_by_severity(self):
        """Count violations by severity."""
        counts = {}
        for v in self.violations:
            counts[v.severity] = counts.get(v.severity, 0) + 1
        return counts
