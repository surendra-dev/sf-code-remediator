import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { ApexCRUDViolationRule } from './rules/apexCRUDViolation.js';
import { ApexSharingViolationRule } from './rules/apexSharingViolation.js';
import { AvoidDebugStatementsRule } from './rules/avoidDebugStatements.js';
import { NoTrailingWhitespaceRule } from './rules/noTrailingWhitespace.js';
import { ApexSOQLInjectionRule } from './rules/apexSOQLInjection.js';
import { CognitiveComplexityRule } from './rules/cognitiveComplexity.js';

export class ApexScanner {
  constructor(targetPath) {
    this.targetPath = targetPath;
    this.rules = [
      new ApexCRUDViolationRule(),
      new ApexSharingViolationRule(),
      new AvoidDebugStatementsRule(),
      new NoTrailingWhitespaceRule(),
      new ApexSOQLInjectionRule(),
      new CognitiveComplexityRule()
    ];
  }

  async scan() {
    const apexFiles = await this.findApexFiles(this.targetPath);
    const violations = [];
    const fileViolations = {};

    for (const filePath of apexFiles) {
      const content = await readFile(filePath, 'utf-8');
      const fileViolationsList = await this.scanFile(filePath, content);
      
      violations.push(...fileViolationsList);
      fileViolations[filePath] = fileViolationsList;
    }

    const violationsByRule = this.groupByRule(violations);
    const violationsBySeverity = this.groupBySeverity(violations);

    return {
      filesScanned: apexFiles.length,
      totalViolations: violations.length,
      violations,
      fileViolations,
      violationsByRule,
      violationsBySeverity,
      scannedAt: new Date().toISOString()
    };
  }

  async scanFile(filePath, content) {
    const violations = [];

    for (const rule of this.rules) {
      const ruleViolations = await rule.check(filePath, content);
      violations.push(...ruleViolations);
    }

    return violations;
  }

  async findApexFiles(dir) {
    const files = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findApexFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && extname(entry.name) === '.cls') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error.message);
    }
    
    return files;
  }

  groupByRule(violations) {
    const grouped = {};
    
    for (const violation of violations) {
      if (!grouped[violation.rule]) {
        grouped[violation.rule] = [];
      }
      grouped[violation.rule].push(violation);
    }
    
    return grouped;
  }

  groupBySeverity(violations) {
    const grouped = {
      Critical: [],
      High: [],
      Moderate: [],
      Low: [],
      Info: []
    };
    
    for (const violation of violations) {
      const severity = violation.severity || 'Info';
      if (grouped[severity]) {
        grouped[severity].push(violation);
      } else {
        grouped.Info.push(violation);
      }
    }
    
    return grouped;
  }
}

