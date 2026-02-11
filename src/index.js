#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { ApexScanner } from './scanner/apexScanner.js';
import { ApexFixer } from './fixer/apexFixer.js';
import { Verifier } from './verifier/verifier.js';
import { HtmlReporter } from './reporter/htmlReporter.js';
import { Prioritizer } from './scanner/prioritizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SalesforceAnalyzer {
  constructor(options = {}) {
    this.targetPath = options.targetPath || process.cwd();
    this.autoFix = options.autoFix || false;
    this.includeTestClasses = options.includeTestClasses !== undefined ? options.includeTestClasses : false;
    this.outputDir = options.outputDir || join(process.cwd(), 'reports');
  }

  async run() {
    this.printHeader();

    const scanner = new ApexScanner(this.targetPath, {
      includeTestClasses: this.includeTestClasses
    });
    const scanResults = await scanner.scan();
    
    // Prioritize results to make them actionable
    const prioritizer = new Prioritizer();
    const prioritizedResults = prioritizer.prioritize(scanResults);
    
    this.printTestClassInfo(scanResults);
    
    this.printScanResults(scanResults);
    this.printPriorityBreakdown(prioritizedResults);
    
    // Get auto-fixable violations (Tier 3 + conditionally fixable Tier 1)
    const autoFixable = this.getAutoFixableViolations(prioritizedResults);
    
    console.log(`\nClassification: ${autoFixable.length} eligible for auto-fix`);

    let fixResults = { fixed: [], failed: [], updatedFiles: [] };
    let verificationResults = null;
    let rescanResults = null;

    if (this.autoFix && autoFixable.length > 0) {
      console.log('\nApplying fixes...');
      const fixer = new ApexFixer(this.targetPath);
      fixResults = await fixer.fix(autoFixable);
      
      console.log(`Fixed: ${fixResults.fixed.length}, Failed: ${fixResults.failed.length}`);

      console.log('\nVerifying changes...');
      const verifier = new Verifier(this.targetPath);
      verificationResults = await verifier.verify(scanResults, fixResults);
      
      console.log(`Verified: ${verificationResults.verified.length}`);
      
      if (verificationResults.rollbacks.length > 0) {
        console.log(`Rollbacks: ${verificationResults.rollbacks.length}`);
      }
      
      // Rescan modified files to get post-fix results
      if (fixResults.updatedFiles.length > 0) {
        console.log('\nRescanning modified files...');
        rescanResults = await scanner.scan();
        console.log(`Rescan complete: ${rescanResults.totalViolations} violations remaining`);
      }
    } else if (this.autoFix) {
      console.log('\nNo fixable violations found');
    } else {
      console.log('\nAuto-fix disabled');
    }

    console.log('\nGenerating report...');
    const reporter = new HtmlReporter(this.outputDir);
    
    // Use rescan results if available, otherwise use original
    const finalResults = rescanResults || scanResults;
    const finalPrioritized = rescanResults 
      ? prioritizer.prioritize(rescanResults)
      : prioritizedResults;
    
    const reportPath = await reporter.generate({
      prioritizedResults: finalPrioritized,
      scanResults: finalResults,
      originalResults: scanResults,
      originalPrioritized: prioritizedResults,
      fixResults,
      verificationResults,
      autoFixEnabled: this.autoFix
    });
    
    console.log(`Report: ${reportPath}`);

    this.printSummary(scanResults, fixResults, reportPath);

    return {
      scanResults,
      fixResults,
      verificationResults,
      rescanResults,
      reportPath
    };
  }

  printHeader() {
    console.log('=' .repeat(60));
    console.log('Salesforce Metadata Analyzer');
    console.log('=' .repeat(60));
    console.log(`Path: ${this.targetPath}`);
    console.log(`Include Test Classes: ${this.includeTestClasses}`);
    console.log(`Auto-fix: ${this.autoFix}`);
    console.log('=' .repeat(60));
  }

  printScanResults(results) {
    console.log(`\nScanned: ${results.filesScanned} files`);
    console.log(`Violations: ${results.totalViolations}`);
  

    const testViolations = results.violations.filter(v => v.isTestCode);
    const testViolations = results.violations.filter(v => v.isTestCode);
    if (testViolations.length > 0) {
    if (testViolations.length > 0) {
      console.log(`\nTest Classes: ${testViolations.length} violations found (scan-only, not auto-fixed)`);
    } else if (this.includeTestClasses) {
      console.log(`\nTest Classes: Included in scan, no violations found`);
    } else {
      console.log(`\nTest Classes: Skipped (use --includeTestClasses to scan)`);
    }

  printPriorityBreakdown(prioritizedResults) {

  printPriorityBreakdown(prioritizedResults) {
    const summary = prioritizedResults.summary;
    
    console.log('\n' + '=' .repeat(60));
    console.log('PRIORITY BREAKDOWN');
    console.log('=' .repeat(60));
    console.log(`🚨 Critical (Fix First):     ${summary.critical}`);
    console.log(`⚠️  Important (Plan Fix):    ${summary.important}`);
    console.log(`🧹 Cleanup (Auto-Fixable):   ${summary.cleanup}`);
    console.log('=' .repeat(60));
    
    if (summary.criticalFindings > 0) {
      console.log('\nCritical issues detected:');
      for (const { rule, findings, occurrences } of summary.criticalRules) {
        console.log(`  - ${rule}: ${findings} findings (${occurrences} occurrences)`);
      }
    }
  }

  /**
   * Get auto-fixable violations (Tier 3 + conditionally fixable Tier 1)
   */
  getAutoFixableViolations(prioritizedResults) {
    const tier1 = prioritizedResults.tiers.TIER1_CRITICAL;
    const tier3 = prioritizedResults.tiers.TIER3_CLEANUP;
    const autoFixable = [];
    
    // Tier 1: Only conditionally fixable rules (CRUD, Sharing)
    if (tier1 && tier1.ruleGroups) {
      for (const [rule, group] of Object.entries(tier1.ruleGroups)) {
        if (rule === 'ApexCRUDViolation' || rule === 'ApexSharingViolation') {
          for (const [filePath, fileGroup] of Object.entries(group.files)) {
            autoFixable.push(...fileGroup.violations.filter(v => v.autoFixable));
          }
        }
      }
    }
    
    // Tier 3: All violations are auto-fixable
    if (tier3 && tier3.ruleGroups) {
      for (const [rule, group] of Object.entries(tier3.ruleGroups)) {
        for (const [filePath, fileGroup] of Object.entries(group.files)) {
          autoFixable.push(...fileGroup.violations.filter(v => v.autoFixable));
        }
      }
    }
    
    return autoFixable;
  }

  printSummary(scanResults, fixResults, reportPath) {
    console.log('\n' + '=' .repeat(60));
    console.log('Summary');
    console.log('=' .repeat(60));
    console.log(`Total: ${scanResults.totalViolations}`);
    console.log(`Fixed: ${fixResults.fixed.length}`);
    console.log(`Remaining: ${scanResults.totalViolations - fixResults.fixed.length}`);
    console.log('=' .repeat(60));
  }
}

/**
 * Resolves the target path for Salesforce metadata analysis.
 * Priority order:
 * 1. Command-line argument (--path <path>)
 * 2. Config file (sf-remediator.config.json)
 * 3. Default fallback (current working directory)
 * 
 * @param {string[]} args - Command-line arguments
 * @returns {string} Resolved absolute path to the target directory
 */
function resolveTargetPath(args) {
  // Priority 1: Command-line argument --path
  const pathIndex = args.indexOf('--path');
  if (pathIndex !== -1 && args[pathIndex + 1]) {
    const cliPath = args[pathIndex + 1];
    const resolvedPath = resolve(cliPath);
    if (existsSync(resolvedPath)) {
      console.log(`Using target path from CLI argument: ${resolvedPath}`);
      return resolvedPath;
    } else {
      console.error(`Error: CLI argument path does not exist: ${resolvedPath}`);
      process.exit(1);
    }
  }

  // Priority 2: Config file
  const configPath = join(process.cwd(), 'sf-remediator.config.json');
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      if (config.targetPath) {
        const resolvedPath = resolve(process.cwd(), config.targetPath);
        if (existsSync(resolvedPath)) {
          console.log(`Using target path from config file: ${resolvedPath}`);
          return resolvedPath;
        } else {
          console.error(`Error: Config file path does not exist: ${resolvedPath}`);
          console.error(`  Config path: ${configPath}`);
          console.error(`  Specified targetPath: ${config.targetPath}`);
          console.error(`  Resolved to: ${resolvedPath}`);
          process.exit(1);
        }
      }
    } catch (error) {
      console.error(`Error reading config file: ${error.message}`);
      process.exit(1);
    }
  }

  // Priority 3: Default fallback
  return process.cwd();

if (import.meta.url === `file://${process.argv[1]}`) {
/**
 * Resolves configuration options from CLI arguments and config file.
 * CLI arguments take priority over config file.
 * 
 * @param {string[]} args - Command-line arguments
 * @returns {object} Configuration object
 */
function resolveConfig(args) {
  const config = {
    includeTestClasses: false
  };
  
  // Load from config file first
  const configPath = join(process.cwd(), 'sf-remediator.config.json');
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(configContent);
      if (fileConfig.includeTestClasses !== undefined) {
        config.includeTestClasses = fileConfig.includeTestClasses;
      }
    } catch (error) {
      // Config file parsing errors are already handled in resolveTargetPath
    }
  }
  
  // CLI arguments override config file
  if (args.includes('--includeTestClasses')) {
    config.includeTestClasses = true;
  }
  
  return config;
if (import.meta.url === `file://${process.argv[1]}`) {
}
  const config = resolveConfig(args);
  

  const config = resolveConfig(args);
  
    includeTestClasses: config.includeTestClasses,
    targetPath: resolveTargetPath(args),
    outputDir: join(process.cwd(), 'reports')
    includeTestClasses: config.includeTestClasses,
  });

  analyzer.run().catch(err => console.error('Error:', err));
}
export { SalesforceAnalyzer };

