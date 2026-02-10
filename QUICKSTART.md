# Quick Start Guide

Get started with Salesforce Metadata Analyzer in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Salesforce Apex `.cls` files to analyze

## Installation

```bash
# No installation needed - uses only Node.js built-in modules
# Just clone or download the repository
```

## Basic Usage

### 1. Scan Only (No Changes)

Navigate to your Salesforce project directory and run:

```bash
node /path/to/salesforce-metadata-analyzer/src/index.js
```

This will:
- Scan all `.cls` files in the current directory
- Detect violations
- Generate an HTML report
- **NOT modify any files**

### 2. Scan and Auto-Fix

```bash
node /path/to/salesforce-metadata-analyzer/src/index.js --autoFix
```

This will:
- Scan all `.cls` files
- Automatically fix safe violations
- Create backups (`.backup` files)
- Verify fixes
- Generate an HTML report

### 3. Test with Examples

Try the tool with included sample files:

```bash
cd salesforce-metadata-analyzer
node examples/run-analysis.js
```

## Understanding the Output

### Console Output

You'll see real-time progress:

```
============================================================
Salesforce Metadata Analyzer
============================================================
Path: /your/project/path
Auto-fix: true
============================================================

Scanned: 10 files
Violations: 25

Classification: 18 auto-fixable, 7 manual

Applying fixes...
Fixed: 18, Failed: 0

Verifying changes...
Verified: 18

Generating report...
Report: /your/project/path/reports/salesforce-analysis-2024-01-15T10-30-00-000Z.html
```

### HTML Report

Open the generated HTML file in your browser to see:

- **Executive Summary**: High-level metrics
- **Auto-Fixed Issues** (Green): What was automatically corrected
- **Not Auto-Fixable Issues** (Red/Yellow): What needs manual review
- **File-Level Summary**: Per-file breakdown

## Next Steps

- Review the HTML report
- Manually fix remaining violations
- Integrate into your CI/CD pipeline
- Customize rules as needed

