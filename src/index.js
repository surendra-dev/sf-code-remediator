#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ApexScanner } from './scanner/apexScanner.js';
import { ApexFixer } from './fixer/apexFixer.js';
import { Verifier } from './verifier/verifier.js';
import { HtmlReporter } from './reporter/htmlReporter.js';

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
    
    this.printScanResults(scanResults);
    
    const autoFixable = scanResults.violations.filter(v => v.autoFixable);
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const analyzer = new SalesforceAnalyzer({
    targetPath: process.cwd(),
    autoFix: args.includes('--autoFix') || args.includes('--fix'),
    outputDir: join(process.cwd(), 'reports')
  });

  analyzer.run().catch(err => console.error('Error:', err));
}

export { SalesforceAnalyzer };

