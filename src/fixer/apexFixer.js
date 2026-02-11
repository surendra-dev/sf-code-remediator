import { readFile, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { CRUDFix } from './fixStrategies/crudFix.js';
import { SharingFix } from './fixStrategies/sharingFix.js';
import { DebugFix } from './fixStrategies/debugFix.js';
import { WhitespaceFix } from './fixStrategies/whitespaceFix.js';

export class ApexFixer {
  constructor(targetPath) {
    this.targetPath = targetPath;
    
    // Tier 3 (Cleanup) rules that can be auto-fixed
    // Tier 1 and Tier 2 should NEVER be auto-fixed
    this.tier3Rules = new Set([
      'NoTrailingWhitespace',
      'AvoidDebugStatements',
      'MissingApexDoc',
      'UnusedVariable'
    ]);
    
    // Tier 1 and Tier 2 rules that should NEVER be auto-fixed
    this.nonAutoFixableRules = new Set([
      'ApexCRUDViolation',
      'ApexSharingViolation',
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
          
          // IMPORTANT: Only auto-fix Tier 3 (Cleanup) issues
          // Never auto-fix Tier 1 (Critical) or Tier 2 (Important)
          if (this.nonAutoFixableRules.has(violation.rule)) {
            console.warn(`Skipping auto-fix for ${violation.rule} (requires manual review)`);
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

