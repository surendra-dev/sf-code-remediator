# Salesforce Metadata Analyzer

A Node.js-based static analysis and automated remediation tool for Salesforce metadata (Apex, with extensibility for LWC and other metadata types).

## Overview

This tool provides comprehensive static analysis of Salesforce code with automated fixing capabilities for common security and quality violations. It follows a strict, deterministic approach to code remediation, ensuring that only safe, well-understood fixes are applied automatically.

## Tech Stack

- **Language**: Node.js (JavaScript ES2020+)
- **Runtime**: Node.js 18+
- **File System**: Native Node.js fs/promises
- **Output**: HTML reports

## Features

### 🔍 Detection (Step 1)

Scans Salesforce Apex `.cls` files and detects violations including:

- **ApexCRUDViolation** (Critical) - DML operations without CRUD/FLS security checks
- **ApexSharingViolation** (High) - Classes without sharing declarations
- **AvoidDebugStatements** (Low) - System.debug() statements in production code
- **NoTrailingWhitespace** (Info) - Lines with trailing whitespace
- **ApexSOQLInjection** (Critical) - Potential SOQL injection vulnerabilities
- **CognitiveComplexity** (Moderate) - Methods with high cognitive complexity

Each violation captures:
- Rule name
- Severity (Critical, High, Moderate, Low, Info)
- File name and path
- Line and column number
- Description
- Auto-fixability status

### 🏷️ Classification (Step 2)

Violations are automatically classified as:

**AUTO-FIXABLE (Safe):**
- AvoidDebugStatements - Remove or comment out System.debug()
- NoTrailingWhitespace - Trim trailing spaces
- ApexSharingViolation - Add 'with sharing' keyword
- ApexCRUDViolation - Add Schema.sObjectType CRUD/FLS checks (when SObject is identifiable)

**NOT AUTO-FIXABLE (Requires Manual Review):**
- ApexSOQLInjection - Requires security context and business logic understanding
- CognitiveComplexity - Requires architectural refactoring
- Complex CRUD violations - When SObject context is unclear

### 🔧 Auto-Fix (Step 3)

When `--autoFix` flag is enabled:

- Applies deterministic fixes only
- Preserves original formatting and indentation
- Creates backups before modifying files
- Never modifies business logic
- Never changes method signatures
- Rolls back on errors

**Fix Strategies:**

1. **CRUD Fix**: Adds Schema.sObjectType permission checks before DML operations
   ```apex
   // Before
   insert account;
   
   // After
   if (!Schema.sObjectType.Account.isCreateable()) {
       throw new System.NoAccessException();
   }
   insert account;
   ```

2. **Sharing Fix**: Adds 'with sharing' to class declarations
   ```apex
   // Before
   public class MyClass {
   
   // After
   public with sharing class MyClass {
   ```

3. **Debug Fix**: Removes System.debug() statements
   ```apex
   // Before
   System.debug('Debug message');
   
   // After
   // System.debug removed
   ```

4. **Whitespace Fix**: Removes trailing whitespace

### ✅ Verification (Step 4)

After applying fixes:

- Re-scans all modified files
- Verifies violations are resolved
- Detects any newly introduced violations
- Automatically rolls back problematic fixes
- Reports verification status

### 📊 HTML Report Generation (Step 5)

Generates a comprehensive, visually rich HTML report with:

1. **Executive Summary**
   - Total files scanned
   - Total violations found
   - Total violations auto-fixed
   - Total remaining violations

2. **Auto-Fixed Issues** (Green Section)
   - Rule name and severity
   - File location (path, line, column)
   - Description
   - Fix applied

3. **Not Auto-Fixable Issues** (Red/Yellow Section)
   - Rule name and severity
   - File location
   - Reason it cannot be auto-fixed
   - Recommended manual remediation steps

4. **File-Level Summary**
   - Per-file violation counts
   - Fixed vs remaining breakdown

5. **Verification Section**
   - Rollback information (if any)
   - New violations detected (if any)

Report features:
- Color-coded severity indicators
- Responsive design
- Easy-to-read formatting
- Timestamp and metadata

## Installation

```bash
# Clone or download the repository
cd salesforce-metadata-analyzer

# No npm dependencies required - uses only Node.js built-in modules
```

## Usage

### Basic Scan (Detection Only)

Scan Salesforce metadata without making any changes:

```bash
node src/index.js
```

### Scan with Auto-Fix

Scan and automatically fix violations:

```bash
node src/index.js --autoFix
```

or

```bash
node src/index.js --fix
```

### Scan Specific Directory

```bash
node src/index.js --path /path/to/salesforce/metadata --autoFix
```

### NPM Scripts

```bash
# Scan only
npm run scan

# Scan with auto-fix
npm run fix
```

## Output

### Console Output

```
============================================================
Salesforce Metadata Analyzer
============================================================
Path: /path/to/project
Auto-fix: true
============================================================

Scanned: 15 files
Violations: 42

Classification: 28 auto-fixable, 14 manual

Applying fixes...
Fixed: 28, Failed: 0

Verifying changes...
Verified: 28

Generating report...
Report: /path/to/project/reports/salesforce-analysis-2024-01-15T10-30-00-000Z.html

============================================================
Summary
============================================================
Total: 42
Fixed: 28
Remaining: 14
============================================================
```

### HTML Report

Generated in `./reports/` directory with timestamp:
- `salesforce-analysis-YYYY-MM-DDTHH-mm-ss-sssZ.html`

## Project Structure

```
salesforce-metadata-analyzer/
├── src/
│   ├── index.js                           # Main entry point and CLI
│   ├── scanner/
│   │   ├── apexScanner.js                 # Main scanner orchestrator
│   │   └── rules/
│   │       ├── apexCRUDViolation.js       # CRUD/FLS violation detection
│   │       ├── apexSharingViolation.js    # Sharing keyword detection
│   │       ├── avoidDebugStatements.js    # Debug statement detection
│   │       ├── noTrailingWhitespace.js    # Whitespace detection
│   │       ├── apexSOQLInjection.js       # SOQL injection detection
│   │       └── cognitiveComplexity.js     # Complexity calculation
│   ├── fixer/
│   │   ├── apexFixer.js                   # Main fixer orchestrator
│   │   └── fixStrategies/
│   │       ├── crudFix.js                 # CRUD/FLS fix implementation
│   │       ├── sharingFix.js              # Sharing keyword fix
│   │       ├── debugFix.js                # Debug statement removal
│   │       └── whitespaceFix.js           # Whitespace trimming
│   ├── verifier/
│   │   └── verifier.js                    # Fix verification and rollback
│   └── reporter/
│       └── htmlReporter.js                # HTML report generation
├── package.json
└── README.md
```

## Rules and Best Practices

### What This Tool DOES:

✅ Detect security and quality violations  
✅ Apply safe, deterministic fixes  
✅ Preserve code formatting and structure  
✅ Create backups before modifications  
✅ Verify fixes don't introduce new issues  
✅ Generate comprehensive reports  

### What This Tool DOES NOT Do:

❌ Refactor business logic  
❌ Change method signatures  
❌ Modify complex security contexts  
❌ Fix SOQL injection automatically  
❌ Reduce cognitive complexity automatically  
❌ Make assumptions about business requirements  

## Requirements

- Node.js 18.0.0 or higher
- Read/write access to Salesforce metadata directory

## License

MIT

## Contributing

Contributions are welcome! Please ensure all contributions:
- Follow Node.js best practices
- Include appropriate error handling
- Maintain the deterministic fix philosophy
- Do not modify business logic

