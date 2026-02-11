# Prioritization System Implementation

## Overview

This document explains how the prioritization system transforms **12,000+ noisy scan results** into **actionable, prioritized issues** that developers and AI assistants (Amazon Q / Agentforce) can effectively remediate.

## The Problem

**Before Prioritization:**
- Scanner detects ~12,000 issues
- Salesforce Code Analyzer reports ~800 issues  
- Massive noise makes remediation impossible
- No way to know "What should I fix FIRST?"

**After Prioritization:**
- Issues grouped into 3 actionable tiers
- Noise reduced through intelligent grouping and deduplication
- Clear guidance on WHY each issue matters
- Auto-fix boundaries prevent dangerous automated changes

## Three-Tier Priority Model

### Tier 1: CRITICAL - Fix First 🚨

**Rules:**
- ApexCRUDViolation
- ApexFLSViolation
- ApexSharingViolation
- ApexSOQLInjection

**Why This Matters:**
Security and data-access risks that could expose sensitive data or bypass security controls.

**Guidance:**
These issues require careful manual review and context-aware fixes. **NEVER auto-fix blindly.**

**Example:**
```
ApexCRUDViolation
→ 150 occurrences across 8 files
→ Recommended Action: Add CRUD/FLS checks before DML operations
```

### Tier 2: IMPORTANT - Plan Fix ⚠️

**Rules:**
- CognitiveComplexity
- OperationWithLimitsInLoop
- ExcessiveDML
- NestedLogic

**Why This Matters:**
Performance and stability risks that impact scalability and maintainability.

**Guidance:**
These issues need refactoring and architectural consideration. Plan fixes carefully.

**Example:**
```
CognitiveComplexity
→ 45 occurrences across 12 files
→ Recommended Action: Refactor complex methods by extracting helper methods
```

### Tier 3: CLEANUP - Auto-Fixable 🧹

**Rules:**
- NoTrailingWhitespace
- AvoidDebugStatements
- MissingApexDoc
- UnusedVariable

**Why This Matters:**
Style and hygiene issues that improve code quality but don't affect functionality.

**Guidance:**
These issues can be safely auto-fixed or addressed in background cleanup work.

**Example:**
```
NoTrailingWhitespace
→ 5,000 occurrences across 120 files (grouped summary)
→ Recommended Action: Remove trailing whitespace (auto-fixable)
```

## Noise Reduction Techniques

### 1. Grouping by Rule
Instead of listing 5,000 individual whitespace violations, the system reports:
- **Rule:** NoTrailingWhitespace
- **Count:** 5,000 occurrences
- **Files:** 120 affected files
- **Top Files:** Shows top 10 worst offenders

### 2. Deduplication
Multiple violations on the same line are consolidated.

### 3. Smart Summarization
- Tier 3 (Cleanup) issues with >20 occurrences show file summaries
- Tier 1 (Critical) and Tier 2 (Important) show individual violations

## Implementation Architecture

### New Files Created

1. **src/scanner/prioritizer.js**
   - Core prioritization logic
   - Tier classification
   - Grouping and deduplication
   - Business context and remediation guidance

2. **src/reporter/priorityRenderer.js**
   - HTML rendering for prioritized results
   - Three-tier visual layout
   - Summary banners and cards

### Modified Files

1. **src/index.js**
   - Integrates prioritizer after scanning
   - Only allows Tier 3 auto-fixes
   - Displays priority breakdown in console

2. **src/reporter/htmlReporter.js**
   - Uses PriorityRenderer for new layout
   - Priority summary at top of report
   - Sections ordered: Critical → Important → Cleanup

3. **src/fixer/apexFixer.js**
   - Enforces auto-fix boundaries
   - Blocks Tier 1 and Tier 2 from auto-fix
   - Only allows Tier 3 (Cleanup) auto-fixes

## How It Reduces 12,000 Issues to Actionable Results

### Before: 12,000 Individual Issues
```
1. NoTrailingWhitespace at line 10
2. NoTrailingWhitespace at line 15
3. NoTrailingWhitespace at line 23
...
5,000. NoTrailingWhitespace at line 9,842
5,001. ApexCRUDViolation at line 45  ← BURIED IN NOISE
```

### After: Prioritized and Grouped
```
🚨 CRITICAL (Fix First): 150 issues
  - ApexCRUDViolation: 80 occurrences
  - ApexSOQLInjection: 70 occurrences

⚠️ IMPORTANT (Plan Fix): 45 issues
  - CognitiveComplexity: 45 occurrences

🧹 CLEANUP (Auto-Fixable): 11,805 issues
  - NoTrailingWhitespace: 5,000 occurrences (grouped)
  - AvoidDebugStatements: 6,805 occurrences (grouped)
```

**Result:** Developers immediately know:
1. **What:** 150 critical security issues
2. **Where:** Specific files and lines
3. **Why:** Security risks that expose data
4. **How:** Clear remediation guidance
5. **Priority:** Fix these FIRST, before cleanup

## Console Output Example

```
============================================================
PRIORITY BREAKDOWN
============================================================
🚨 Critical (Fix First):     150
⚠️  Important (Plan Fix):    45
🧹 Cleanup (Auto-Fixable):   11,805
============================================================

Critical issues detected:
  - ApexCRUDViolation: 80
  - ApexSOQLInjection: 70
```

## HTML Report Enhancements

### Priority Summary Banner
- Three cards showing Critical / Important / Cleanup counts
- Clear visual hierarchy with color coding
- "What should I fix FIRST?" messaging

### Tier Sections
Each tier displays:
1. **Icon and Title** (🚨 Critical - Fix First)
2. **Why This Matters** explanation
3. **Guidance** for remediation approach
4. **Grouped Rules** with counts
5. **Recommended Actions** for each rule
6. **Individual Violations** or file summaries

### Visual Design
- Critical issues use red color coding
- Important issues use yellow/orange
- Cleanup issues use blue
- Cleanup issues never visually dominate critical issues

## Auto-Fix Safety Boundaries

### Tier 1 (Critical): NEVER auto-fix
- ApexCRUDViolation requires manual CRUD/FLS logic
- ApexSOQLInjection needs bind variable decisions
- ApexSharingViolation needs security context

### Tier 2 (Important): NEVER auto-fix
- CognitiveComplexity requires refactoring strategy
- Performance issues need architectural decisions

### Tier 3 (Cleanup): Safe to auto-fix
- NoTrailingWhitespace is deterministic
- AvoidDebugStatements has no side effects
- Style fixes don't change functionality

## Integration with AI Assistants

The prioritized output is designed to be consumed by:
- **Amazon Q Developer**: Can focus on high-priority fixes
- **Agentforce**: Gets clear context for remediation
- **Human Developers**: Know exactly what to fix first

The structured format provides:
- Clear priority levels
- Business context (why it matters)
- Remediation guidance (how to fix)
- Safety boundaries (what not to auto-fix)

## Summary

**Input:** 12,000 undifferentiated scan results  
**Output:** Actionable 3-tier priority system  
**Result:** Developers can immediately focus on 150 critical issues instead of being overwhelmed by noise  

This transforms static analysis from a "noise generator" into an "actionable remediation tool."
