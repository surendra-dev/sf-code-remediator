# Architecture Documentation

## System Overview

The Salesforce Metadata Analyzer is a Node.js-based static analysis and automated remediation tool designed with a modular, extensible architecture.

## Design Principles

1. **Deterministic Fixes Only**: Only apply fixes that are safe and well-understood
2. **No Business Logic Changes**: Never modify method signatures or business logic
3. **Fail-Safe**: Create backups and rollback on errors
4. **Extensible**: Easy to add new rules and fix strategies
5. **Zero Dependencies**: Uses only Node.js built-in modules

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Entry Point                          │
│                    (src/index.js)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Step 1: SCAN   │     │  Configuration  │
│   (Detection)   │     │    & Options    │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         ApexScanner                     │
│  ┌─────────────────────────────────┐   │
│  │  Rule Engine                    │   │
│  │  - ApexCRUDViolation           │   │
│  │  - ApexSharingViolation        │   │
│  │  - AvoidDebugStatements        │   │
│  │  - NoTrailingWhitespace        │   │
│  │  - ApexSOQLInjection           │   │
│  │  - CognitiveComplexity         │   │
│  └─────────────────────────────────┘   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 2: CLASSIFY                       │
│  (Auto-fixable vs Manual)              │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 3: FIX (if --autoFix enabled)    │
│                                         │
│         ApexFixer                       │
│  ┌─────────────────────────────────┐   │
│  │  Fix Strategies                 │   │
│  │  - CRUDFix                      │   │
│  │  - SharingFix                   │   │
│  │  - DebugFix                     │   │
│  │  - WhitespaceFix                │   │
│  └─────────────────────────────────┘   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 4: VERIFY                         │
│                                         │
│         Verifier                        │
│  - Re-scan modified files               │
│  - Detect new violations                │
│  - Rollback if issues found             │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 5: REPORT                         │
│                                         │
│      HtmlReporter                       │
│  - Executive Summary                    │
│  - Auto-Fixed Issues                    │
│  - Manual Issues                        │
│  - File-Level Summary                   │
└─────────────────────────────────────────┘
```

## Core Components

### 1. Scanner Module (`src/scanner/`)

**Purpose**: Detect violations in Salesforce Apex code

**Components**:
- `apexScanner.js`: Orchestrates the scanning process
- `rules/*.js`: Individual rule implementations

**Flow**:
1. Recursively find all `.cls` files
2. Read file content
3. Apply each rule to detect violations
4. Aggregate and classify results
5. Return structured violation data

**Rule Interface**:
```javascript
class Rule {
  constructor() {
    this.name = 'RuleName';
    this.severity = 'Critical|High|Moderate|Low|Info';
    this.autoFixable = true|false;
    this.description = 'Rule description';
  }

  async check(filePath, content) {
    // Return array of violations
    return [{
      rule: this.name,
      severity: this.severity,
      filePath,
      line: number,
      column: number,
      description: string,
      autoFixable: boolean,
      context: object
    }];
  }
}
```

### 2. Fixer Module (`src/fixer/`)

**Purpose**: Apply deterministic fixes to auto-fixable violations

**Components**:
- `apexFixer.js`: Orchestrates the fixing process
- `fixStrategies/*.js`: Individual fix implementations

**Flow**:
1. Group violations by file
2. Create backup of each file
3. Sort violations by line (descending) to avoid line number shifts
4. Apply fix strategy for each violation
5. Write modified content
6. Track success/failure

**Fix Strategy Interface**:
```javascript
class FixStrategy {
  async apply(content, violation) {
    // Return fix result
    return {
      success: boolean,
      content: string,  // Modified content
      description: string,  // What was fixed
      reason: string  // If failed, why
    };
  }
}
```

### 3. Verifier Module (`src/verifier/`)

**Purpose**: Verify fixes and rollback if issues are introduced

**Flow**:
1. Re-scan all modified files
2. Compare violations before/after
3. Check if fixed violations are resolved
4. Detect newly introduced violations
5. Rollback files with new issues

### 4. Reporter Module (`src/reporter/`)

**Purpose**: Generate comprehensive HTML reports

**Features**:
- Responsive design
- Color-coded severity indicators
- Executive summary with metrics
- Detailed violation listings
- File-level breakdown
- Recommended actions

## Data Flow

```
Input: Directory Path + Options
  ↓
Scanner: Detect Violations
  ↓
Classifier: Auto-fixable vs Manual
  ↓
Fixer: Apply Safe Fixes (if enabled)
  ↓
Verifier: Validate Changes
  ↓
Reporter: Generate HTML Report
  ↓
Output: Modified Files + Report
```

## Extension Points

### Adding a New Rule

1. Create `src/scanner/rules/newRule.js`
2. Implement the rule interface
3. Add to `apexScanner.js` rule list

### Adding a New Fix Strategy

1. Create `src/fixer/fixStrategies/newFix.js`
2. Implement the fix strategy interface
3. Add to `apexFixer.js` strategy map

## Security Considerations

- File backups created before modifications
- Rollback mechanism for failed fixes
- No external dependencies (reduces supply chain risk)
- Read-only scanning by default
- Explicit opt-in for modifications (--autoFix flag)

