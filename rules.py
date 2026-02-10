"""
Rule definitions for Salesforce Apex static analysis.
Each rule contains metadata, patterns, and auto-fix capability.
"""

import re

class Severity:
    CRITICAL = "Critical"
    HIGH = "High"
    MODERATE = "Moderate"
    LOW = "Low"
    INFO = "Info"

class AutoFixCapability:
    SAFE = "safe"  # Fully auto-fixable
    PARTIAL = "partial"  # Partially auto-fixable with context
    NONE = "none"  # Not auto-fixable

class Rule:
    def __init__(self, name, severity, description, pattern, auto_fix_capability, remediation_guidance):
        self.name = name
        self.severity = severity
        self.description = description
        self.pattern = pattern  # Compiled regex pattern
        self.auto_fix_capability = auto_fix_capability
        self.remediation_guidance = remediation_guidance

# Define all rules
RULES = {
    "AvoidDebugStatements": Rule(
        name="AvoidDebugStatements",
        severity=Severity.MODERATE,
        description="Avoid using System.debug statements in production code",
        pattern=re.compile(r'System\.debug\s*\(', re.IGNORECASE),
        auto_fix_capability=AutoFixCapability.SAFE,
        remediation_guidance="Remove or comment out System.debug statements to improve performance and reduce log clutter."
    ),
    
    "NoTrailingWhitespace": Rule(
        name="NoTrailingWhitespace",
        severity=Severity.LOW,
        description="Lines should not have trailing whitespace",
        pattern=re.compile(r'[ \t]+$', re.MULTILINE),
        auto_fix_capability=AutoFixCapability.SAFE,
        remediation_guidance="Remove trailing whitespace from lines to maintain clean code."
    ),
    
    "ApexSharingViolation": Rule(
        name="ApexSharingViolation",
        severity=Severity.CRITICAL,
        description="Apex classes should declare a sharing model (with sharing, without sharing, or inherited sharing)",
        pattern=re.compile(
            r'^\s*(public|global)\s+(class|abstract\s+class|virtual\s+class)\s+\w+(?!\s+(with|without|inherited)\s+sharing)',
            re.MULTILINE | re.IGNORECASE
        ),
        auto_fix_capability=AutoFixCapability.SAFE,
        remediation_guidance="Add 'with sharing' to the class declaration to enforce record-level security."
    ),
    
    "ApexCRUDViolation": Rule(
        name="ApexCRUDViolation",
        severity=Severity.CRITICAL,
        description="Validate CRUD/FLS permissions before DML operations or SOQL queries",
        pattern=re.compile(
            r'\b(insert|update|delete|upsert|merge)\s+[a-zA-Z_]\w*\s*;|'
            r'\[\s*SELECT\s+.+?\s+FROM\s+\w+',
            re.IGNORECASE | re.DOTALL
        ),
        auto_fix_capability=AutoFixCapability.PARTIAL,
        remediation_guidance="Add Schema.sObjectType checks for isAccessible(), isCreateable(), isUpdateable(), or isDeletable() before DML operations."
    ),
    
    "ApexSOQLInjection": Rule(
        name="ApexSOQLInjection",
        severity=Severity.CRITICAL,
        description="Potential SOQL injection vulnerability detected",
        pattern=re.compile(
            r'\[\s*SELECT\s+.*?\+.*?FROM|'
            r'Database\.query\s*\(\s*[^\'"]',
            re.IGNORECASE | re.DOTALL
        ),
        auto_fix_capability=AutoFixCapability.NONE,
        remediation_guidance="Use bind variables or String.escapeSingleQuotes() to prevent SOQL injection attacks. Avoid concatenating user input directly into SOQL queries."
    ),
    
    "CognitiveComplexity": Rule(
        name="CognitiveComplexity",
        severity=Severity.MODERATE,
        description="Method has high cognitive complexity",
        pattern=None,  # Calculated programmatically
        auto_fix_capability=AutoFixCapability.NONE,
        remediation_guidance="Refactor complex methods by extracting logic into smaller, focused methods. Reduce nesting levels and simplify conditional logic."
    ),
}

def calculate_cognitive_complexity(method_body):
    """
    Calculate cognitive complexity based on control flow structures.
    This is a simplified version of the cognitive complexity metric.
    """
    complexity = 0
    nesting_level = 0
    
    # Patterns that increase complexity
    control_flow_patterns = [
        (r'\bif\s*\(', 1),
        (r'\belse\s+if\s*\(', 1),
        (r'\belse\s*\{', 1),
        (r'\bfor\s*\(', 1),
        (r'\bwhile\s*\(', 1),
        (r'\bdo\s*\{', 1),
        (r'\bcatch\s*\(', 1),
        (r'\bcase\s+', 1),
        (r'\&\&', 1),
        (r'\|\|', 1),
        (r'\?.*?:', 1),  # Ternary operator
    ]
    
    lines = method_body.split('\n')
    for line in lines:
        # Track nesting level
        if '{' in line:
            nesting_level += line.count('{')
        if '}' in line:
            nesting_level -= line.count('}')
            nesting_level = max(0, nesting_level)
        
        # Check for control flow patterns
        for pattern, weight in control_flow_patterns:
            matches = re.findall(pattern, line, re.IGNORECASE)
            complexity += len(matches) * weight * max(1, nesting_level)
    
    return complexity

def detect_cognitive_complexity(file_content, threshold=15):
    """
    Detect methods with high cognitive complexity.
    Returns list of violations with line numbers.
    """
    violations = []
    
    # Find all methods
    method_pattern = re.compile(
        r'(public|private|protected|global)\s+(static\s+)?\w+\s+(\w+)\s*\([^)]*\)\s*\{',
        re.IGNORECASE
    )
    
    lines = file_content.split('\n')
    for i, line in enumerate(lines, 1):
        match = method_pattern.search(line)
        if match:
            # Extract method body (simplified - just look ahead ~50 lines)
            method_body = '\n'.join(lines[i:min(i+50, len(lines))])
            complexity = calculate_cognitive_complexity(method_body)
            
            if complexity > threshold:
                violations.append((i, complexity))
    
    return violations
