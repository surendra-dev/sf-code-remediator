import { readFile, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { CRUDFix } from './fixStrategies/crudFix.js';
import { SharingFix } from './fixStrategies/sharingFix.js';
import { DebugFix } from './fixStrategies/debugFix.js';
import { WhitespaceFix } from './fixStrategies/whitespaceFix.js';

export class ApexFixer {
  constructor(targetPath) {
    this.targetPath = targetPath;
    
    // Tier 3 (Cleanup) rules - always auto-fixable
    this.tier3Rules = new Set([
      'NoTrailingWhitespace',
      'AvoidDebugStatements',
      'MissingApexDoc',
      'UnusedVariable'
    ]);
    
    // Auto-safe and auto-guarded rules (Tier 1)
    // These can be auto-fixed under specific conditions
    this.conditionallyFixableRules = new Set([
      'ApexCRUDViolation',
      'ApexSharingViolation'
    ]);
    
    // Rules that should NEVER be auto-fixed
    this.nonAutoFixableRules = new Set([
      'ApexSOQLInjection',
      'CognitiveComplexity',
      'OperationWithLimitsInLoop'
    ]);
    
    this.fixStrategies = {
      'ApexCRUDViolation': new CRUDFix(),
      'ApexSharingViolation': new SharingFix(),
      'AvoidDebugStatements': new DebugFix(),
      'NoTrailingWhitespace': new WhitespaceFix()
    };
  }

  async fix(violations) {
    const fixed = [];
    const failed = [];
    const updatedFiles = new Set();
    
    const violationsByFile = this.groupByFile(violations);
    
    for (const [filePath, fileViolations] of Object.entries(violationsByFile)) {
      try {
        await this.backupFile(filePath);
        
        let content = await readFile(filePath, 'utf-8');
        let modified = false;
        
        const sortedViolations = fileViolations.sort((a, b) => b.line - a.line);
        
        for (const violation of sortedViolations) {
          if (!violation.autoFixable) {
            continue;
          }
          
          // Skip rules that should never be auto-fixed
          if (this.nonAutoFixableRules.has(violation.rule)) {
            failed.push({ violation, reason: 'Rule not eligible for auto-fix' });
            continue;
          }
          
          const strategy = this.fixStrategies[violation.rule];
          
          if (strategy) {
            try {
              const result = await strategy.apply(content, violation);
              
              if (result.success) {
                content = result.content;
                modified = true;
                fixed.push({
                  violation,
                  fixApplied: result.description
                });
              } else {
                failed.push({
                  violation,
                  reason: result.reason
                });
              }
            } catch (error) {
              failed.push({
                violation,
                reason: error.message
              });
            }
          }
        }
        
        if (modified) {
          await writeFile(filePath, content, 'utf-8');
          updatedFiles.add(filePath);
        }
        
      } catch (error) {
        for (const violation of fileViolations) {
          failed.push({
            violation,
            reason: `File processing error: ${error.message}`
          });
        }
      }
    }
    
    return {
      fixed,
      failed,
      updatedFiles: Array.from(updatedFiles)
    };
  }

  groupByFile(violations) {
    const grouped = {};
    
    for (const violation of violations) {
      if (!grouped[violation.filePath]) {
        grouped[violation.filePath] = [];
      }
      grouped[violation.filePath].push(violation);
    }
    
    return grouped;
  }

  async backupFile(filePath) {
    const backupPath = `${filePath}.backup`;
    try {
      await copyFile(filePath, backupPath);
    } catch (error) {
      console.warn(`Warning: Could not create backup for ${filePath}`);
    }
  }
}

