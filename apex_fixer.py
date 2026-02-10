"""
Auto-fix engine for Apex code violations.
"""

import os
import re
import shutil
from rules import RULES, AutoFixCapability

class ApexFixer:
    """Handles automatic fixing of detected violations."""
    
    def __init__(self, violations, backup_directory=".backup"):
        self.violations = violations
        self.backup_directory = backup_directory
        self.fixed_list = []
        self.failed_list = []
    
    def process_all_fixes(self):
        """Process and apply all possible fixes."""
        print(f"\n=== Starting Auto-Fix Process ===")
        
        # Organize violations by their file location
        file_groups = {}
        for violation in self.violations:
            rule = RULES.get(violation.rule_name)
            if rule and rule.auto_fix_capability in [AutoFixCapability.SAFE, AutoFixCapability.PARTIAL]:
                if violation.file_path not in file_groups:
                    file_groups[violation.file_path] = []
                file_groups[violation.file_path].append(violation)
        
        # Handle each file separately
        for filepath, violation_list in file_groups.items():
            try:
                self._process_single_file(filepath, violation_list)
            except Exception as error:
                print(f"  ERROR processing {filepath}: {error}")
                self.failed_list.extend(violation_list)
        
        print(f"\n=== Fix Summary: {len(self.fixed_list)} fixed, {len(self.failed_list)} failed ===")
    
    def _process_single_file(self, filepath, violation_list):
        """Process fixes for one file."""
        print(f"  Processing: {filepath}")
        
        # Backup original file
        self._create_backup(filepath)
        
        # Load file content
        with open(filepath, 'r', encoding='utf-8') as file:
            file_content = file.read()
        
        original_content = file_content
        
        # Sort by line number in reverse to maintain line indices
        violation_list.sort(key=lambda v: v.line_number, reverse=True)
        
        # Apply appropriate fix for each violation
        for violation in violation_list:
            try:
                if violation.rule_name == "AvoidDebugStatements":
                    file_content = self._remove_debug_statements(file_content, violation)
                elif violation.rule_name == "NoTrailingWhitespace":
                    file_content = self._remove_trailing_spaces(file_content, violation)
                elif violation.rule_name == "ApexSharingViolation":
                    file_content = self._add_sharing_keyword(file_content, violation)
                elif violation.rule_name == "ApexCRUDViolation":
                    file_content = self._add_security_checks(file_content, violation)
            except Exception as error:
                print(f"    FAILED: {violation.rule_name} at line {violation.line_number} - {error}")
                self.failed_list.append(violation)
                continue
        
        # Save if changes were made
        if file_content != original_content:
            with open(filepath, 'w', encoding='utf-8') as file:
                file.write(file_content)
    
    def _create_backup(self, filepath):
        """Create backup copy of file."""
        if not os.path.exists(self.backup_directory):
            os.makedirs(self.backup_directory)
        
        backup_location = os.path.join(self.backup_directory, os.path.basename(filepath))
        shutil.copy2(filepath, backup_location)
    
    def _remove_debug_statements(self, file_content, violation):
        """Comment out debug statements."""
        content_lines = file_content.split('\n')
        target_line = violation.line_number - 1
        
        if 0 <= target_line < len(content_lines):
            current_line = content_lines[target_line]
            
            if 'System.debug' in current_line:
                # Handle single-line debug statements
                if current_line.strip().endswith(';'):
                    content_lines[target_line] = re.sub(
                        r'(\s*)(System\.debug\s*\([^;]*\);)',
                        r'\1// \2',
                        current_line,
                        flags=re.IGNORECASE
                    )
                    violation.fixed = True
                    violation.fix_description = "Debug statement commented out"
                    self.fixed_list.append(violation)
                else:
                    # Multi-line case
                    spaces = len(current_line) - len(current_line.lstrip())
                    content_lines[target_line] = ' ' * spaces + '// ' + current_line.lstrip()
                    violation.fixed = True
                    violation.fix_description = "Debug statement commented out"
                    self.fixed_list.append(violation)
        
        return '\n'.join(content_lines)
    
    def _remove_trailing_spaces(self, file_content, violation):
        """Strip trailing whitespace."""
        content_lines = file_content.split('\n')
        
        # Process all lines
        modifications = 0
        for idx in range(len(content_lines)):
            before = content_lines[idx]
            content_lines[idx] = content_lines[idx].rstrip()
            if before != content_lines[idx]:
                modifications += 1
        
        if modifications > 0:
            violation.fixed = True
            violation.fix_description = f"Stripped trailing whitespace from {modifications} lines"
            self.fixed_list.append(violation)
        
        return '\n'.join(content_lines)
    
    def _add_sharing_keyword(self, file_content, violation):
        """Insert 'with sharing' into class declaration."""
        content_lines = file_content.split('\n')
        target_line = violation.line_number - 1
        
        if 0 <= target_line < len(content_lines):
            current_line = content_lines[target_line]
            
            # Modify class declaration to include sharing
            updated_line = re.sub(
                r'\b(public|global)\s+(class|abstract\s+class|virtual\s+class)\b',
                r'\1 with sharing \2',
                current_line,
                flags=re.IGNORECASE
            )
            
            if updated_line != current_line:
                content_lines[target_line] = updated_line
                violation.fixed = True
                violation.fix_description = "'with sharing' added to class"
                self.fixed_list.append(violation)
        
        return '\n'.join(content_lines)
    
    def _add_security_checks(self, file_content, violation):
        """Insert CRUD/FLS permission checks."""
        content_lines = file_content.split('\n')
        target_line = violation.line_number - 1
        
        if 0 <= target_line < len(content_lines):
            current_line = content_lines[target_line]
            
            # Detect DML operations
            dml_pattern = re.search(r'\b(insert|update|delete|upsert)\s+([a-zA-Z_]\w*)', current_line, re.IGNORECASE)
            soql_pattern = re.search(r'\[\s*SELECT\s+.+?\s+FROM\s+(\w+)', current_line, re.IGNORECASE | re.DOTALL)
            
            if dml_pattern:
                dml_operation = dml_pattern.group(1).lower()
                variable_ref = dml_pattern.group(2)
                
                # Determine SObject type
                object_type = self._find_object_type(content_lines, target_line, variable_ref)
                
                if object_type:
                    check_statement = self._build_crud_check(dml_operation, object_type)
                    line_indent = len(current_line) - len(current_line.lstrip())
                    
                    # Insert check before operation
                    content_lines.insert(target_line, ' ' * line_indent + check_statement)
                    
                    violation.fixed = True
                    violation.fix_description = f"Added {dml_operation} permission check for {object_type}"
                    self.fixed_list.append(violation)
            
            elif soql_pattern:
                object_type = soql_pattern.group(1)
                check_statement = self._build_read_check(object_type)
                line_indent = len(current_line) - len(current_line.lstrip())
                
                # Insert check before query
                content_lines.insert(target_line, ' ' * line_indent + check_statement)
                
                violation.fixed = True
                violation.fix_description = f"Added read permission check for {object_type}"
                self.fixed_list.append(violation)
        
        return '\n'.join(content_lines)
    
    def _find_object_type(self, content_lines, current_idx, var_name):
        """Infer SObject type from variable declaration."""
        # Search backwards for declaration
        for idx in range(max(0, current_idx - 10), current_idx):
            line = content_lines[idx]
            
            # Check for List<Type> varName
            list_pattern = re.search(rf'List<(\w+)>\s+{var_name}\b', line, re.IGNORECASE)
            if list_pattern:
                return list_pattern.group(1)
            
            # Check for Type varName =
            type_pattern = re.search(rf'\b(\w+)\s+{var_name}\s*=', line)
            if type_pattern:
                inferred_type = type_pattern.group(1)
                # Verify it looks like an SObject
                if inferred_type[0].isupper() and inferred_type not in ['String', 'Integer', 'Boolean', 'Decimal', 'List', 'Set', 'Map']:
                    return inferred_type
        
        return None
    
    def _build_crud_check(self, operation, object_type):
        """Generate CRUD check code."""
        if operation == 'insert':
            return f"if (!Schema.sObjectType.{object_type}.isCreateable()) {{ throw new System.NoAccessException(); }}"
        elif operation == 'update':
            return f"if (!Schema.sObjectType.{object_type}.isUpdateable()) {{ throw new System.NoAccessException(); }}"
        elif operation == 'delete':
            return f"if (!Schema.sObjectType.{object_type}.isDeletable()) {{ throw new System.NoAccessException(); }}"
        elif operation == 'upsert':
            return f"if (!Schema.sObjectType.{object_type}.isCreateable() || !Schema.sObjectType.{object_type}.isUpdateable()) {{ throw new System.NoAccessException(); }}"
        return ""
    
    def _build_read_check(self, object_type):
        """Generate read permission check."""
        return f"if (!Schema.sObjectType.{object_type}.isAccessible()) {{ throw new System.NoAccessException(); }}"
    
    def rollback_file(self, filepath):
        """Restore file from backup."""
        backup_location = os.path.join(self.backup_directory, os.path.basename(filepath))
        if os.path.exists(backup_location):
            shutil.copy2(backup_location, filepath)
            print(f"Rolled back {filepath}")
        else:
            print(f"No backup available for {filepath}")
    
    def check_syntax(self, file_content):
        """Basic syntax validation."""
        # Verify balanced braces
        open_count = file_content.count('{')
        close_count = file_content.count('}')
        
        return open_count == close_count
