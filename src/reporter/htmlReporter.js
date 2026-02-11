import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PriorityRenderer } from './priorityRenderer.js';
import { SalesforceQueryRenderer } from './salesforceQueryRenderer.js';

export class HtmlReporter {
  constructor(outputDir) {
    this.outputDir = outputDir;
  }

  async generate(data) {
    await mkdir(this.outputDir, { recursive: true });

    const html = this.buildReportWithFixes(data);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `salesforce-analysis-${timestamp}.html`;
    const reportPath = join(this.outputDir, filename);

    await writeFile(reportPath, html, 'utf-8');

    return reportPath;
  }

  buildReportWithFixes(data) {
    const { scanResults, prioritizedResults, fixResults, autoFixEnabled, originalResults } = data;
    
    const originalTotal = originalResults?.totalViolations || scanResults.totalViolations;
    const fixedCount = fixResults?.fixed?.length || 0;
    const remainingCount = scanResults.totalViolations;
    const failedCount = fixResults?.failed?.length || 0;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Salesforce Code Analyzer Report with Remediation</title>
    ${this.getStyles()}
</head>
<body>
    <div class="container">
        ${this.buildHeader()}
        ${this.buildRemediationSummary(originalTotal, fixedCount, remainingCount, failedCount, autoFixEnabled)}
        ${this.buildViolationsByTier(prioritizedResults, fixResults)}
        ${this.buildFooter()}
    </div>
</body>
</html>`;
  }

  buildHtml(data) {
    const { scanResults, fixResults, verificationResults, autoFixEnabled } = data;
    const prioritizedResults = data.prioritizedResults;
    
    const priorityRenderer = prioritizedResults ? new PriorityRenderer() : null;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Salesforce Code Analysis Report</title>
    ${this.getStyles()}
</head>
<body>
    <div class="container">
        ${this.buildHeader()}
        ${priorityRenderer ? priorityRenderer.renderSummaryBanner(prioritizedResults) : ''}
        ${priorityRenderer ? priorityRenderer.renderAllTiers(prioritizedResults, fixResults) : 
          this.buildExecutiveSummary(scanResults, fixResults, autoFixEnabled) + 
          this.buildAutoFixedSection(fixResults)}
        ${this.buildNotAutoFixableSection(scanResults, fixResults)}
        ${this.buildFileLevelSummary(scanResults, fixResults)}
        ${this.buildVerificationSection(verificationResults)}
        ${this.buildFooter()}
    </div>
</body>
</html>`;
  }

  getStyles() {
    return `<style>
        /* Priority-specific styles */
        .priority-banner {
            background: linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .banner-title { font-size: 2em; margin-bottom: 10px; }
        .banner-subtitle { font-size: 1.1em; opacity: 0.95; }
        .priority-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 20px;
        }
        .pcard {
            background: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .pcard.critical-card { border-top: 5px solid #d63031; }
        .pcard.important-card { border-top: 5px solid #fdcb6e; }
        .pcard.cleanup-card { border-top: 5px solid #74b9ff; }
        .card-icon { font-size: 2em; margin-bottom: 10px; font-weight: bold; }
        .card-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #2c3e50;
            margin: 10px 0;
        }
        .card-label { font-size: 1.1em; color: #636e72; font-weight: 600; }
        .card-info {
            font-size: 0.9em;
            color: #636e72;
            margin-top: 10px;
            line-height: 1.4;
        }
        .tier-explanation {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }
        .tier-explanation.tier-critical { border-left-color: #d63031; }
        .tier-explanation.tier-important { border-left-color: #fdcb6e; }
        .tier-explanation.tier-cleanup { border-left-color: #74b9ff; }
        .tier-explanation .guidance-text { margin-top: 5px; font-style: italic; }
        .section-title.tier-critical { border-bottom-color: #d63031; color: #d63031; }
        .section-title.tier-important { border-bottom-color: #fdcb6e; color: #e17055; }
        .section-title.tier-cleanup { border-bottom-color: #74b9ff; color: #0984e3; }
        .rule-block {
            background: #f8f9fa;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .rule-block.tier-critical { border-left-color: #d63031; }
        .rule-block.tier-important { border-left-color: #fdcb6e; }
        .rule-block.tier-cleanup { border-left-color: #74b9ff; }
        .rule-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e1e8ed;
        }
        .rule-title { font-size: 1.3em; font-weight: bold; color: #2c3e50; }
        .rule-meta { color: #636e72; margin-top: 5px; }
        .occurrence-info { margin-left: 10px; }
        .rule-total { font-size: 1.5em; font-weight: bold; color: #636e72; }
        .remediation-box {
            background: #fff3cd;
            padding: 10px 15px;
            border-radius: 5px;
            margin-top: 10px;
            color: #856404;
        }
        .file-summary-box {
            background: white;
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
        }
        .file-list { margin-left: 20px; line-height: 1.8; }
        .more-files { margin-top: 10px; color: #636e72; font-style: italic; }
        .more-violations {
            text-align: center;
            padding: 15px;
            color: #636e72;
            font-style: italic;
        }
        .fixed-label {
            background: #00b894;
            color: white;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.85em;
            margin-left: 10px;
        }
        .empty-icon { font-size: 3em; margin-bottom: 10px; }
        .test-code-label {
            background: #9c27b0;
            color: white;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.85em;
            margin-left: 10px;
        }

        * {
        /* Base styles */
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f7fa;
            color: #2c3e50;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .section {
            background: white;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .section-title {
            font-size: 1.8em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            color: #2c3e50;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .summary-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }

        .summary-card.success {
            border-left-color: #00b894;
            background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
        }

        .summary-card.warning {
            border-left-color: #fdcb6e;
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .summary-card.danger {
            border-left-color: #ff7675;
            background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
        }

        .summary-card h3 {
            font-size: 0.9em;
            text-transform: uppercase;
            color: #636e72;
            margin-bottom: 10px;
        }

        .summary-card .value {
            font-size: 2.5em;
            font-weight: bold;
            color: #2c3e50;
        }

        .violation-list {
            margin-top: 20px;
        }

        .violation-item {
            background: #f8f9fa;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            border-left: 4px solid #95a5a6;
        }

        .violation-item.fixed {
            border-left-color: #00b894;
            background: #f0fff4;
        }

        .violation-item.critical {
            border-left-color: #d63031;
        }

        .violation-item.high {
            border-left-color: #ff7675;
        }

        .violation-item.moderate {
            border-left-color: #fdcb6e;
        }

        .violation-item.low {
            border-left-color: #74b9ff;
        }

        .violation-item.info {
            border-left-color: #a29bfe;
        }

        .violation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .violation-rule {
            font-weight: bold;
            font-size: 1.1em;
            color: #2c3e50;
        }

        .severity-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            text-transform: uppercase;
        }

        .severity-badge.critical {
            background: #d63031;
            color: white;
        }

        .severity-badge.high {
            background: #ff7675;
            color: white;
        }

        .severity-badge.moderate {
            background: #fdcb6e;
            color: #2c3e50;
        }

        .severity-badge.low {
            background: #74b9ff;
            color: white;
        }

        .severity-badge.info {
            background: #a29bfe;
            color: white;
        }

        .violation-details {
            margin-top: 10px;
            font-size: 0.95em;
            color: #636e72;
        }

        .violation-location {
            font-family: 'Courier New', monospace;
            background: #2c3e50;
            color: #00b894;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .code-snippet {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            overflow-x: auto;
        }

        .fix-description {
            background: #d4edda;
            color: #155724;
            padding: 10px 15px;
            border-radius: 5px;
            margin-top: 10px;
            border-left: 3px solid #00b894;
        }

        .manual-action {
            background: #fff3cd;
            color: #856404;
            padding: 10px 15px;
            border-radius: 5px;
            margin-top: 10px;
            border-left: 3px solid #fdcb6e;
        }

        .file-summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .file-summary-table th,
        .file-summary-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e1e8ed;
        }

        .file-summary-table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #2c3e50;
        }

        .file-summary-table tr:hover {
            background: #f8f9fa;
        }

        .footer {
            text-align: center;
            padding: 20px;
            color: #636e72;
            font-size: 0.9em;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: #636e72;
        }

        .empty-state-icon {
            font-size: 3em;
            margin-bottom: 10px;
        }
    </style>`;
  }

  buildHeader() {
    return `<div class="header">
        <h1>🔍 Salesforce Security Review</h1>
        <p>Static Analysis Report • Generated on ${new Date().toLocaleString()}</p>
    </div>`;
  }

  buildExecutiveSummary(scanResults, fixResults, autoFixEnabled) {
    const totalFiles = scanResults.filesScanned;
    const totalViolations = scanResults.totalViolations;
    const fixedCount = fixResults.fixed.length;
    const remainingCount = totalViolations - fixedCount;

    return `<div class="section">
        <h2 class="section-title">Executive Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Files Scanned</h3>
                <div class="value">${totalFiles}</div>
            </div>
            <div class="summary-card danger">
                <h3>Total Violations</h3>
                <div class="value">${totalViolations}</div>
            </div>
            <div class="summary-card success">
                <h3>Auto-Fixed</h3>
                <div class="value">${fixedCount}</div>
            </div>
            <div class="summary-card warning">
                <h3>Remaining</h3>
                <div class="value">${remainingCount}</div>
            </div>
        </div>
        ${!autoFixEnabled ? '<p style="padding: 15px; background: #fff3cd; border-radius: 5px; color: #856404;"><strong>Note:</strong> Auto-fix was disabled. Run with --autoFix to apply automatic fixes.</p>' : ''}
    </div>`;
  }

  buildAutoFixedSection(fixResults) {
    if (fixResults.fixed.length === 0) {
      return `<div class="section">
          <h2 class="section-title">✅ Auto-Fixed Issues</h2>
          <div class="empty-state">
              <div class="empty-state-icon">📭</div>
              <p>No issues were auto-fixed</p>
          </div>
      </div>`;
    }

    const violationsHtml = fixResults.fixed.map(item => {
      const v = item.violation;
      return `<div class="violation-item fixed">
          <div class="violation-header">
              <span class="violation-rule">${v.rule}</span>
              <span class="severity-badge ${v.severity.toLowerCase()}">${v.severity}</span>
          </div>
          <div class="violation-details">
              <p><strong>File:</strong> ${v.filePath}</p>
              <p><strong>Location:</strong> <span class="violation-location">Line ${v.line}, Column ${v.column}</span></p>
              <p><strong>Description:</strong> ${v.description}</p>
          </div>
          <div class="fix-description">
              <strong>✓ Fix Applied:</strong> ${item.fixApplied}
          </div>
      </div>`;
    }).join('');

    return `<div class="section">
        <h2 class="section-title">✅ Auto-Fixed Issues (${fixResults.fixed.length})</h2>
        <div class="violation-list">${violationsHtml}</div>
    </div>`;
  }

  buildNotAutoFixableSection(scanResults, fixResults) {
    const fixedRuleLines = new Set(
      fixResults.fixed.map(f => `${f.violation.rule}-${f.violation.filePath}-${f.violation.line}`)
    );

    const notFixed = scanResults.violations.filter(v =>
      !fixedRuleLines.has(`${v.rule}-${v.filePath}-${v.line}`)
    );

    if (notFixed.length === 0) {
      return `<div class="section">
          <h2 class="section-title">⚠️ Not Auto-Fixable Issues</h2>
          <div class="empty-state">
              <div class="empty-state-icon">🎉</div>
              <p>All issues have been fixed!</p>
          </div>
      </div>`;
    }

    const violationsHtml = notFixed.map(v => {
      const reason = v.autoFixable ? 'Fix failed or was skipped' : 'Requires manual review and context';
      return `<div class="violation-item ${v.severity.toLowerCase()}">
      const testLabel = v.isTestCode ? `<span class="test-code-label">🧪 Test Code (Not Auto-Fixed)</span>` : '';
      const actualReason = v.isTestCode ? 'Test code is never auto-fixed' : reason;
      
          <div class="violation-header">
              <span class="violation-rule">${v.rule}</span>
              <div>
                  <span class="violation-rule">${v.rule}</span>
                  ${testLabel}
              </div>
          </div>
          <div class="violation-details">
              <p><strong>File:</strong> ${v.filePath}</p>
              <p><strong>Location:</strong> <span class="violation-location">Line ${v.line}, Column ${v.column}</span></p>
              <p><strong>Description:</strong> ${v.description}</p>
          </div>
          <div class="manual-action">
              <strong>⚠ Reason:</strong> ${reason}<br>
              <strong>⚠ Reason:</strong> ${actualReason}<br>
          </div>
      </div>`;
    }).join('');

    return `<div class="section">
        <h2 class="section-title">⚠️ Not Auto-Fixable Issues (${notFixed.length})</h2>
        <div class="violation-list">${violationsHtml}</div>
    </div>`;
  }

  buildFileLevelSummary(scanResults, fixResults) {
    const fileSummaries = {};

    for (const [filePath, violations] of Object.entries(scanResults.fileViolations)) {
      const fixed = fixResults.fixed.filter(f => f.violation.filePath === filePath).length;
      fileSummaries[filePath] = {
        total: violations.length,
        fixed,
        remaining: violations.length - fixed
      };
    }

    const rows = Object.entries(fileSummaries).map(([filePath, summary]) => {
      return `<tr>
          <td>${filePath}</td>
          <td style="text-align: center;">${summary.total}</td>
          <td style="text-align: center; color: #00b894; font-weight: bold;">${summary.fixed}</td>
          <td style="text-align: center; color: #ff7675; font-weight: bold;">${summary.remaining}</td>
      </tr>`;
    }).join('');

    return `<div class="section">
        <h2 class="section-title">📁 File-Level Summary</h2>
        <table class="file-summary-table">
            <thead>
                <tr>
                    <th>File</th>
                    <th style="text-align: center;">Total Violations</th>
                    <th style="text-align: center;">Fixed</th>
                    <th style="text-align: center;">Remaining</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
  }

  buildVerificationSection(verificationResults) {
    if (!verificationResults || verificationResults.rollbacks.length === 0) {
      return '';
    }

    return `<div class="section">
        <h2 class="section-title">⚠️ Verification Issues</h2>
        <p style="padding: 15px; background: #fff3cd; border-radius: 5px; color: #856404;">
            Some fixes introduced new violations and were rolled back.
        </p>
    </div>`;
  }

  buildFooter() {
    return `<div class="footer">
        <p>Generated by Salesforce Metadata Analyzer v1.0.0</p>
        <p>Node.js Static Analysis & Remediation Tool</p>
    </div>`;
  }
  
  buildRemediationSummary(originalTotal, fixedCount, remainingCount, failedCount, autoFixEnabled) {
    return `<div class="section">
        <h2 class="section-title">📊 Remediation Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Original Issues</h3>
                <div class="value">${originalTotal}</div>
                <p>Detected before remediation</p>
            </div>
            <div class="summary-card success">
                <h3>✅ Auto-Fixed</h3>
                <div class="value">${fixedCount}</div>
                <p>Successfully remediated</p>
            </div>
            <div class="summary-card warning">
                <h3>⚠️ Manual Action</h3>
                <div class="value">${remainingCount}</div>
                <p>Require manual review</p>
            </div>
            ${failedCount > 0 ? `<div class="summary-card danger">
                <h3>❌ Fix Failed</h3>
                <div class="value">${failedCount}</div>
                <p>Could not auto-fix</p>
            </div>` : ''}
        </div>
        ${!autoFixEnabled ? '<div class="remediation-box" style="margin-top: 20px;"><strong>Note:</strong> Auto-fix was disabled. Run with --autoFix to apply automatic fixes.</div>' : ''}
        <div class="remediation-box" style="margin-top: 20px; background: #e3f2fd; color: #1565c0; border-left: 4px solid #1976d2;">
            <strong>🔒 Salesforce Security Best Practices Applied:</strong><br>
            • SOQL queries: Added WITH SECURITY_ENFORCED<br>
            • DML operations: Added FLS checks (Schema.sObjectType checks)<br>
            • Class declarations: Added 'with sharing' keyword<br>
            • Only safe, non-breaking fixes applied automatically
        </div>
    </div>`;
  }

  buildViolationsByTier(prioritizedResults, fixResults) {
    const fixedMap = new Map();
    const failedMap = new Map();
    
    if (fixResults) {
      for (const item of fixResults.fixed || []) {
        const key = `${item.violation.rule}-${item.violation.filePath}-${item.violation.line}`;
        fixedMap.set(key, item.fixApplied);
      }
      for (const item of fixResults.failed || []) {
        const key = `${item.violation.rule}-${item.violation.filePath}-${item.violation.line}`;
        failedMap.set(key, item.reason);
      }
    }
    
    let html = '';
    
    if (prioritizedResults.tiers.TIER1_CRITICAL) {
      html += this.buildTierSection(
        'TIER1_CRITICAL',
        'Critical - Security & Data Access',
        '🚨',
        prioritizedResults.tiers.TIER1_CRITICAL,
        fixedMap,
        failedMap,
        'These are security-critical issues. Auto-fixes applied where safe (SOQL, DML with clear context).'
      );
    }
    
    if (prioritizedResults.tiers.TIER2_IMPORTANT) {
      html += this.buildTierSection(
        'TIER2_IMPORTANT',
        'Important - Performance & Stability',
        '⚠️',
        prioritizedResults.tiers.TIER2_IMPORTANT,
        fixedMap,
        failedMap,
        'These issues require manual refactoring and architectural decisions.'
      );
    }
    
    if (prioritizedResults.tiers.TIER3_CLEANUP) {
      html += this.buildTierSection(
        'TIER3_CLEANUP',
        'Cleanup - Code Quality',
        '🧹',
        prioritizedResults.tiers.TIER3_CLEANUP,
        fixedMap,
        failedMap,
        'These are style and hygiene issues that can be safely auto-fixed.'
      );
    }
    
    return html;
  }

  buildTierSection(tierKey, tierName, icon, tierData, fixedMap, failedMap, description) {
    if (!tierData || !tierData.ruleGroups || Object.keys(tierData.ruleGroups).length === 0) {
      return '';
    }
    
    const tierClass = tierKey.toLowerCase().replace('_', '-');
    
    let rulesHtml = '';
    for (const [ruleName, ruleGroup] of Object.entries(tierData.ruleGroups)) {
      rulesHtml += this.buildRuleGroup(ruleName, ruleGroup, fixedMap, failedMap, tierClass);
    }
    
    return `<div class="section">
        <h2 class="section-title ${tierClass}">${icon} ${tierName}</h2>
        <div class="tier-explanation ${tierClass}">
            <p>${description}</p>
        </div>
        ${rulesHtml}
    </div>`;
  }

  buildRuleGroup(ruleName, ruleGroup, fixedMap, failedMap, tierClass) {
    const fileCount = Object.keys(ruleGroup.files).length;
    const totalOccurrences = ruleGroup.count;
    
    let filesHtml = '';
    let showCount = 0;
    const maxShow = 5;
    
    for (const [filePath, fileData] of Object.entries(ruleGroup.files)) {
      if (showCount >= maxShow) break;
      
      let violationsHtml = '';
      for (const violation of fileData.violations.slice(0, 3)) {
        const key = `${violation.rule}-${violation.filePath}-${violation.line}`;
        const isFixed = fixedMap.has(key);
        const isTest = violation.isTestCode;
        const isFailed = failedMap.has(key);
        
        const statusLabel = isFixed 
          : isTest
          ? `<span class="fixed-label" style="background: #9c27b0;">🧪 Test Code (Not Auto-Fixed)</span>`
          ? `<span class="fixed-label">✅ Auto-Fixed: ${fixedMap.get(key)}</span>`
          : isFailed
          ? `<span class="fixed-label" style="background: #ff9800;">❌ ${failedMap.get(key)}</span>`
          : `<span class="fixed-label" style="background: #f44336;">⚠️ Manual Fix Required</span>`;
        
        violationsHtml += `<div style="margin: 5px 0 5px 20px; font-size: 0.9em;">
            Line ${violation.line}: ${violation.description} ${statusLabel}
        </div>`;
      }
      
      filesHtml += `<div class="file-summary-box">
          <strong>📄 ${filePath}</strong> (${fileData.count} occurrence${fileData.count > 1 ? 's' : ''})
          ${violationsHtml}
      </div>`;
      showCount++;
    }
    
    return `<div class="rule-block ${tierClass}">
        <div class="rule-header-row">
            <div>
                <div class="rule-title">${ruleName}</div>
                <div class="rule-meta">${fileCount} file${fileCount > 1 ? 's' : ''} • ${totalOccurrences} occurrence${totalOccurrences > 1 ? 's' : ''}</div>
            </div>
        </div>
        <div class="remediation-box">${ruleGroup.remediation || 'Review and fix according to Salesforce best practices.'}</div>
        ${filesHtml}
        ${fileCount > maxShow ? `<div class="more-files">...and ${fileCount - maxShow} more file(s)</div>` : ''}
    </div>`;
  }

  getRecommendedAction(rule) {
    const actions = {
      'ApexSOQLInjection': 'Use bind variables or String.escapeSingleQuotes() to prevent SOQL injection',
      'CognitiveComplexity': 'Refactor method to reduce complexity by extracting helper methods',
      'ApexCRUDViolation': 'Manually review and add appropriate CRUD/FLS checks based on business logic',
      'ApexSharingViolation': 'Review class requirements and add appropriate sharing keyword'
    };

    return actions[rule] || 'Manually review and fix according to best practices';
  }
}

