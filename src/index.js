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
    this.outputDir = options.outputDir || join(process.cwd(), 'reports');
  }

  async run() {
    this.printHeader();

    const scanner = new ApexScanner(this.targetPath);
    const scanResults = await scanner.scan();
    
    // Prioritize results to make them actionable
    const prioritizer = new Prioritizer();
    const prioritizedResults = prioritizer.prioritize(scanResults);
    
    this.printScanResults(scanResults);
    this.printPriorityBreakdown(prioritizedResults);
    
    // Only allow auto-fix for Tier 3 (Cleanup) issues
    const autoFixable = this.getAutoFixableViolations(prioritizedResults);
    const notAutoFixable = scanResults.violations.filter(v => !v.autoFixable);
    
    console.log(`\nClassification: ${autoFixable.length} auto-fixable, ${notAutoFixable.length} manual`);

    let fixResults = { fixed: [], failed: [], updatedFiles: [] };
    let verificationResults = null;

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
    } else if (this.autoFix) {
      console.log('\nNo fixable violations found');
    } else {
      console.log('\nAuto-fix disabled');
    }

    console.log('\nGenerating report...');
    const reporter = new HtmlReporter(this.outputDir);
    const reportPath = await reporter.generate({
      prioritizedResults,
      scanResults,
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
      reportPath
    };
  }

  printHeader() {
    console.log('=' .repeat(60));
    console.log('Salesforce Metadata Analyzer');
    console.log('=' .repeat(60));
    console.log(`Path: ${this.targetPath}`);
    console.log(`Auto-fix: ${this.autoFix}`);
    console.log('=' .repeat(60));
  }

  printScanResults(results) {
    console.log(`\nScanned: ${results.filesScanned} files`);
    console.log(`Violations: ${results.totalViolations}`);
  }

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
   * Get auto-fixable violations (only Tier 3)
   */
  getAutoFixableViolations(prioritizedResults) {
    const tier3 = prioritizedResults.tiers.TIER3_CLEANUP;
    const autoFixable = [];
    
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
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const analyzer = new SalesforceAnalyzer({
    targetPath: resolveTargetPath(args),
    autoFix: args.includes('--autoFix') || args.includes('--fix'),
    outputDir: join(process.cwd(), 'reports')
  });

  analyzer.run().catch(err => console.error('Error:', err));
}

export { SalesforceAnalyzer };

