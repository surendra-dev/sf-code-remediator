# Salesforce Apex Static Analysis & Remediation Tool
An automated tool for detecting code quality and security issues in Salesforce Apex code, with intelligent auto-fix capabilities and comprehensive HTML reporting.

## Features

- **Comprehensive Detection**: Scans Apex `.cls` files for common violations
- **Safe Auto-Fix**: Automatically fixes deterministic, safe issues
- **Detailed Reporting**: Generates beautiful HTML reports with actionable insights
- **Backup & Rollback**: Creates backups before applying fixes
- **Verification**: Validates fixes don't introduce new issues

## Supported Rules

### Auto-Fixable (Safe)

| Rule | Severity | Description |
|------|----------|-------------|
| **AvoidDebugStatements** | Moderate | Removes/comments out System.debug statements |
| **NoTrailingWhitespace** | Low | Strips trailing whitespace from lines |
| **ApexSharingViolation** | Critical | Adds 'with sharing' to class declarations |

### Partially Auto-Fixable

| Rule | Severity | Description |
|------|----------|-------------|
| **ApexCRUDViolation** | Critical | Adds Schema.sObjectType permission checks before DML operations |

### Not Auto-Fixable (Detection Only)

| Rule | Severity | Description |
|------|----------|-------------|
| **ApexSOQLInjection** | Critical | Detects potential SOQL injection vulnerabilities |
| **CognitiveComplexity** | Moderate | Identifies methods with high cognitive complexity |

## Installation

### Prerequisites

- Python 3.7 or higher
- No external dependencies required (uses standard library only)

### Setup

```bash
# Clone or download this repository
git clone <repository-url>
cd apex-analysis-tool

# No additional installation needed - uses Python standard library
```

## Usage

### Basic Scan (Detection Only)

```bash
python main.py --directory ./sample_apex --no-fix
```

### Scan with Auto-Fix

```bash
python main.py --directory ./sample_apex --autofix
```

### Custom Output Location

```bash
python main.py --directory ./apex_code --autofix --output my_report.html
```

### Command-Line Options

```
Options:
  --directory, -d    Directory containing Apex .cls files (required)
  --autofix          Enable automatic fixing of safe violations
  --no-fix           Disable automatic fixing (detection only)
  --output, -o       Output HTML report filename (default: apex_analysis_report.html)
  --help, -h         Show help message
```

## Workflow

The tool follows a structured workflow:

### Step 1: Detection
- Scans all `.cls` files in the specified directory
- Applies regex-based pattern matching
- Calculates cognitive complexity for methods
- Captures violations with file, line, and column information

### Step 2: Classification
- Classifies each violation as:
  - **Safe Auto-Fixable**: Can be fixed deterministically
  - **Partially Auto-Fixable**: Can be fixed with context inference
  - **Not Auto-Fixable**: Requires manual intervention

### Step 3: Auto-Fix (if enabled)
- Creates backup copies of files in `.backup/` directory
- Applies fixes only for auto-fixable rules
- Preserves code formatting and indentation
- Does NOT modify business logic

### Step 4: Verification
- Validates syntax after fixes
- Checks for balanced braces
- Rolls back if issues detected

### Step 5: Report Generation
- Generates comprehensive HTML report
- Highlights fixed issues in green
- Highlights manual issues in yellow/red
- Provides actionable remediation guidance

## Example Output

### Console Output

```
======================================================================
Salesforce Apex Static Analysis & Remediation Tool
======================================================================
Directory: ./sample_apex
Auto-Fix: Enabled
Report Output: apex_analysis_report.html
======================================================================

STEP 1: DETECTION
Scanning directory: ./sample_apex
  Scanning: ./sample_apex/AccountController.cls
  Scanning: ./sample_apex/ContactService.cls
Scanned 2 file(s), found 12 violation(s)

STEP 2: AUTO-FIX
=== Starting Auto-Fix Process ===
  Processing: ./sample_apex/AccountController.cls
  Processing: ./sample_apex/ContactService.cls
=== Fix Summary: 8 fixed, 0 failed ===

STEP 3: REPORT GENERATION
Generating HTML report: apex_analysis_report.html
Report generation completed

======================================================================
Analysis complete! Report saved to: apex_analysis_report.html
======================================================================
```

### HTML Report Sections

1. **Summary**: Overview with key metrics
   - Files scanned
   - Total violations
   - Auto-fixed count
   - Remaining issues

2. **Auto-Fixed Issues**: Green-highlighted resolved violations
   - Rule name and description
   - File location and line number
   - Code snippet
   - Fix applied

3. **Manual Action Required**: Red/yellow-highlighted pending issues
   - Severity level
   - File location and line number
   - Code snippet
   - Recommended remediation steps

4. **File Summary**: Per-file breakdown table
   - Fixed vs remaining counts
   - Total violations per file

## Fix Examples

### AvoidDebugStatements

**Before:**
```apex
System.debug('Fetching accounts');
```

**After:**
```apex
// System.debug('Fetching accounts');
```

### ApexSharingViolation

**Before:**
```apex
public class AccountController {
```

**After:**
```apex
public with sharing class AccountController {
```

### ApexCRUDViolation

**Before:**
```apex
insert acc;
```

**After:**
```apex
if (!Schema.sObjectType.Account.isCreateable()) { throw new System.NoAccessException(); }
insert acc;
```

## Safety Guarantees

The tool follows strict safety rules:

1. ✅ **Never invents fixes** - Only applies predefined, deterministic patterns
2. ✅ **Never refactors logic** - Preserves business logic exactly as written
3. ✅ **Creates backups** - All original files backed up before modification
4. ✅ **Validates syntax** - Checks for syntax errors after fixes
5. ✅ **Rollback capability** - Can restore from backup if issues detected
6. ✅ **No scanner modification** - Never modifies HTML reports
7. ✅ **Valid Apex guarantee** - All fixed code remains syntactically valid

## File Structure

```
.
├── main.py                 # CLI entry point
├── apex_analyzer.py        # Detection engine
├── apex_fixer.py           # Auto-fix engine
├── report_generator.py     # HTML report generator
├── rules.py                # Rule definitions
├── README.md               # This file
├── sample_apex/            # Sample Apex files for testing
│   ├── AccountController.cls
│   ├── ContactService.cls
│   └── OpportunityHandler.cls
└── .backup/                # Backup directory (created at runtime)
```

## Extending the Tool

### Adding New Rules

Edit `rules.py` and add a new rule:

```python
RULES["YourNewRule"] = Rule(
    name="YourNewRule",
    severity=Severity.MODERATE,
    description="Description of the rule",
    pattern=re.compile(r'your-regex-pattern'),
    auto_fix_capability=AutoFixCapability.SAFE,  # or PARTIAL or NONE
    remediation_guidance="How to fix this issue manually"
)
```

### Adding New Fixes

Edit `apex_fixer.py` and add a fix method:

```python
def _fix_your_rule(self, file_content, violation):
    # Implement your fix logic here
    # Return modified file_content
    pass
```

## Limitations

- **Regex-based**: Uses pattern matching, not a full Apex parser
- **Context inference**: May not detect all SObject types for CRUD checks
- **Complex fixes**: Cannot fix issues requiring business logic understanding
- **SOQL injection**: Detection only - cannot auto-fix safely
- **Cognitive complexity**: Detection only - refactoring requires manual work

## Best Practices

1. **Test on samples first**: Run on sample/test code before production
2. **Review fixes**: Always review auto-fixed code before committing
3. **Version control**: Use git or similar to track changes
4. **Iterative fixing**: Run multiple times if needed
5. **Manual review**: Address non-auto-fixable issues manually

## Troubleshooting

### No violations found
- Verify `.cls` files exist in the directory
- Check file permissions
- Ensure files contain actual Apex code

### Fixes not applied
- Ensure `--autofix` flag is used
- Check console output for error messages
- Verify write permissions on files

### Syntax errors after fixing
- Tool should auto-rollback
- Check `.backup/` directory for original files
- Report issue with specific file/rule combination

## Contributing

Contributions welcome! Please:
1. Test thoroughly with sample Apex code
2. Follow existing code patterns
3. Add tests for new rules
4. Update documentation

## License

This tool is provided as-is for educational and development purposes.

## Disclaimer

This tool provides automated suggestions and fixes. Always:
- Review all changes before deployment
- Test thoroughly in a sandbox environment
- Understand the security implications of fixes
- Maintain proper backups of your code

---

**Happy Coding! 🚀**
