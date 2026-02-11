/**
 * Prioritization layer for scan results
 * Transforms noisy raw occurrences into actionable, prioritized findings
 * 
 * PHILOSOPHY: Root-cause aggregation (Salesforce Security Scanner style)
 * - One rule per file = ONE finding (with N occurrences)
 * THREE TIERS:
 * - Tier 1 (CRITICAL): Security & data access - Fix First
 * - Tier 2 (IMPORTANT): Performance & stability - Plan Fix
 * - Tier 3 (CLEANUP): Style & hygiene - Auto-Fixable
 */

export class Prioritizer {
  constructor() {
    // Tier definitions with business context
    this.tierDefinitions = {
      TIER1_CRITICAL: {
        name: 'Critical - Fix First',
        icon: '🚨',
        priority: 1,
        autoFixAllowed: false,
        rules: [
          'ApexCRUDViolation',
          'ApexFLSViolation',
          'ApexSharingViolation',
          'ApexSOQLInjection'
        ],
        description: 'Security and data-access risks that could expose sensitive data or bypass security controls',
        guidance: 'These issues require careful manual review and context-aware fixes. Never auto-fix blindly.'
      },
      TIER2_IMPORTANT: {
        name: 'Important - Plan Fix',
        icon: '⚠️',
        priority: 2,
        autoFixAllowed: false,
        rules: [
          'CognitiveComplexity',
          'OperationWithLimitsInLoop',
          'ExcessiveDML',
          'NestedLogic'
        ],
        description: 'Performance and stability risks that impact scalability and maintainability',
        guidance: 'These issues need refactoring and architectural consideration. Plan fixes carefully.'
      },
      TIER3_CLEANUP: {
        name: 'Cleanup - Auto-Fixable',
        icon: '🧹',
        priority: 3,
        autoFixAllowed: true,
        rules: [
          'NoTrailingWhitespace',
          'AvoidDebugStatements',
          'MissingApexDoc',
          'UnusedVariable'
        ],
        description: 'Style and hygiene issues that improve code quality but don\'t affect functionality',
        guidance: 'These issues can be safely auto-fixed or addressed in background cleanup work.'
      }
    };

    // Build reverse lookup map: rule -> tier
    this.ruleTierMap = {};
    for (const [tierKey, tierDef] of Object.entries(this.tierDefinitions)) {
      for (const rule of tierDef.rules) {
        this.ruleTierMap[rule] = tierKey;
      }
    }
  }

  /**
   * Prioritize and group violations using root-cause aggregation
   * Key: One rule per file = ONE finding (with N occurrences tracked)
   * @param {Object} scanResults - Raw scan results
   * @returns {Object} Prioritized results with grouping and context
   */
  prioritize(scanResults) {
    const violations = scanResults.violations || [];
    
    // Step 1: Classify violations by tier
    const tierClassified = this.classifyByTier(violations);
    
    // Step 2: Group by rule+file (root-cause aggregation)
    const groupedByTier = this.groupWithinTiers(tierClassified);
    
    // Calculate summary statistics
    const summary = this.calculateSummary(groupedByTier);
    
    // Add explanations and remediation guidance
    const enriched = this.enrichWithContext(groupedByTier);
    
    return {
      original: scanResults,
      summary,
      tiers: enriched,
      prioritizedAt: new Date().toISOString()
    };
  }

  /**
   * Classify violations into tiers
   */
  classifyByTier(violations) {
    const classified = {
      TIER1_CRITICAL: [],
      TIER2_IMPORTANT: [],
      TIER3_CLEANUP: []
    };

    for (const violation of violations) {
      const tierKey = this.ruleTierMap[violation.rule];
      
      if (tierKey) {
        classified[tierKey].push(violation);
      } else {
        // Default: classify by severity if rule not explicitly mapped
        if (violation.severity === 'Critical' || violation.severity === 'High') {
          classified.TIER1_CRITICAL.push(violation);
        } else if (violation.severity === 'Moderate') {
          classified.TIER2_IMPORTANT.push(violation);
        } else {
          classified.TIER3_CLEANUP.push(violation);
        }
      }
    }

    return classified;
  }

  /**
   * Group violations within each tier to reduce noise
   */
  groupWithinTiers(tierClassified) {
    const grouped = {};

    for (const [tierKey, violations] of Object.entries(tierClassified)) {
      grouped[tierKey] = this.groupViolations(violations);
    }

    return grouped;
  }

  /**
   * Group violations by rule and file
   */
   * Each rule+file combination = ONE finding with N occurrences
  groupViolations(violations) {
    const byRule = {};

    for (const violation of violations) {
      const rule = violation.rule;
      
      if (!byRule[rule]) {
        byRule[rule] = {
          rule,
          severity: violation.severity,
          autoFixable: violation.autoFixable,
          count: 0,
          fileCount: 0,
          files: {}, // Detailed breakdown by file
          instances: []
        };
      }

      byRule[rule].count++;
      
      // Group by file
      const filePath = violation.filePath;
      if (!byRule[rule].files[filePath]) {
        byRule[rule].files[filePath] = {
          filePath: filePath,
          count: 0,
          violations: []
        };
      }
      
      byRule[rule].files[filePath].count++;
      byRule[rule].files[filePath].violations.push(violation);
      
      // Keep first few instances for display
      if (byRule[rule].instances.length < 5) {
        byRule[rule].instances.push(violation);
      }
    }
    
    // Calculate file counts for each rule
    for (const rule in byRule) {
      byRule[rule].fileCount = Object.keys(byRule[rule].files).length;
    }

    return byRule;
  }

  /**
   * Calculate summary statistics
   * CRITICAL: Count FINDINGS (rule+file pairs), not raw occurrences
   * This aligns with Salesforce Security Scanner philosophy
   */
  calculateSummary(groupedByTier) {
    const summary = {
      // Findings = number of rule+file combinations
      criticalFindings: 0,
      importantFindings: 0,
      cleanupFindings: 0,
      totalFindings: 0,
      
      // Occurrences = raw violation count (for reference)
      criticalOccurrences: 0,
      importantOccurrences: 0,
      cleanupOccurrences: 0,
      totalOccurrences: 0,
      
      // Rule-level breakdown
      criticalRules: [],
      importantRules: [],
      cleanupRules: []
    };

    for (const [tierKey, ruleGroups] of Object.entries(groupedByTier)) {
      for (const [rule, group] of Object.entries(ruleGroups)) {
        const occurrenceCount = group.count;
        const findingCount = group.fileCount; // One finding per file for this rule
        
        if (tierKey === 'TIER1_CRITICAL') {
          summary.criticalFindings += findingCount;
          summary.criticalOccurrences += occurrenceCount;
          summary.criticalRules.push({ rule, findings: findingCount, occurrences: occurrenceCount });
        } else if (tierKey === 'TIER2_IMPORTANT') {
          summary.importantFindings += findingCount;
          summary.importantOccurrences += occurrenceCount;
          summary.importantRules.push({ rule, findings: findingCount, occurrences: occurrenceCount });
        } else if (tierKey === 'TIER3_CLEANUP') {
          summary.cleanupFindings += findingCount;
          summary.cleanupOccurrences += occurrenceCount;
          summary.cleanupRules.push({ rule, findings: findingCount, occurrences: occurrenceCount });
        }
      }
    }
    
    summary.totalFindings = summary.criticalFindings + summary.importantFindings + summary.cleanupFindings;
    summary.totalOccurrences = summary.criticalOccurrences + summary.importantOccurrences + summary.cleanupOccurrences;

    return summary;
  }

  /**
   * Enrich with business context and remediation guidance
   */
  enrichWithContext(groupedByTier) {
    const enriched = {};

    for (const [tierKey, ruleGroups] of Object.entries(groupedByTier)) {
      const tierDef = this.tierDefinitions[tierKey];
      
      enriched[tierKey] = {
        tier: tierDef,
        ruleGroups: this.addRemediationGuidance(ruleGroups)
      };
    }

    return enriched;
  }

  /**
   * Add remediation guidance for each rule
   */
  addRemediationGuidance(ruleGroups) {
    const guidance = {
      'ApexCRUDViolation': 'Add CRUD/FLS checks before DML operations. Use Schema.sObjectType methods to verify permissions.',
      'ApexSOQLInjection': 'Use bind variables or String.escapeSingleQuotes() to prevent SOQL injection attacks.',
      'ApexSharingViolation': 'Add appropriate sharing keywords (with sharing, without sharing, inherited sharing) based on security requirements.',
      'CognitiveComplexity': 'Refactor complex methods by extracting helper methods and reducing nested logic.',
      'NoTrailingWhitespace': 'Remove trailing whitespace characters from lines.',
      'AvoidDebugStatements': 'Remove System.debug() statements before deploying to production.'
    };

    for (const [rule, group] of Object.entries(ruleGroups)) {
      group.remediation = guidance[rule] || 'Review and fix according to Salesforce best practices.';
    }

    return ruleGroups;
  }
}
