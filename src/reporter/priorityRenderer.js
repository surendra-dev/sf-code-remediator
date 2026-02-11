/**
 * Priority-based HTML rendering for scan results
 * 
 * PHILOSOPHY: Salesforce Security Scanner style
 * - Report FINDINGS (rule+file pairs), not raw occurrences
 * - Severity is rule-driven, NOT count-driven
 * - Occurrences are metadata, not separate "issues"
 * - Show: Why this matters + Recommended action + Sample locations
 */

export class PriorityRenderer {
  
  renderSummaryBanner(prioritizedResults) {
    const summary = prioritizedResults.summary;
    
    // Display findings prominently, occurrences as context
    return `
      <div class="priority-banner">
        <h2 class="banner-title">Priority Summary</h2>
        <p class="banner-subtitle">Security Review Summary - ${summary.totalFindings} finding(s) from ${summary.totalOccurrences} occurrence(s)</p>
        
        <div class="priority-cards">
          <div class="pcard critical-card">
            <div class="card-icon">🚨</div>
            <div class="card-number">${summary.criticalFindings}</div>
            <div class="card-label">Critical - Fix First</div>
            <div class="card-info">Security & data access violations</div>
            <div class="card-info" style="font-size: 0.85em; opacity: 0.8;">${summary.criticalOccurrences} occurrence(s)</div>
          </div>
          
          <div class="pcard important-card">
            <div class="card-icon">⚠️</div>
            <div class="card-number">${summary.importantFindings}</div>
            <div class="card-label">Important - Plan Fix</div>
            <div class="card-info">Performance & maintainability risks</div>
            <div class="card-info" style="font-size: 0.85em; opacity: 0.8;">${summary.importantOccurrences} occurrence(s)</div>
          </div>
          
          <div class="pcard cleanup-card">
            <div class="card-icon">🧹</div>
            <div class="card-number">${summary.cleanupFindings}</div>
            <div class="card-label">Cleanup - Auto-Fixable</div>
            <div class="card-info">Code hygiene & style</div>
            <div class="card-info" style="font-size: 0.85em; opacity: 0.8;">${summary.cleanupOccurrences} occurrence(s)</div>
          </div>
        </div>
      </div>
    `;
  }

  renderAllTiers(prioritizedResults, fixResults) {
    const tiers = prioritizedResults.tiers;
    let html = '';
    
    html += this.renderSingleTier(tiers.TIER1_CRITICAL, 'critical', fixResults);
    html += this.renderSingleTier(tiers.TIER2_IMPORTANT, 'important', fixResults);
    html += this.renderSingleTier(tiers.TIER3_CLEANUP, 'cleanup', fixResults);
    
    return html;
  }

  renderSingleTier(tierData, className, fixResults) {
    if (!tierData || !tierData.ruleGroups || Object.keys(tierData.ruleGroups).length === 0) {
      const tierInfo = tierData?.tier || {};
      return `
        <div class="section">
          <h2 class="section-title tier-${className}">${tierInfo.icon || ''} ${tierInfo.name || 'No Issues'}</h2>
          <div class="empty-state">
            <div class="empty-icon">CHECK</div>
            <p>No issues in this category</p>
          </div>
        </div>
      `;
    }

    const tierInfo = tierData.tier;
    const ruleGroups = tierData.ruleGroups;
    
    // Sort by file count (findings), not raw occurrences
    const sortedRules = Object.entries(ruleGroups).sort((a, b) => b[1].fileCount - a[1].fileCount);
    const rulesHtml = sortedRules.map(([ruleName, group]) => 
      this.renderRuleGroup(ruleName, group, className, fixResults)
    ).join('');

    return `
      <div class="section">
        <h2 class="section-title tier-${className}">${tierInfo.icon} ${tierInfo.name}</h2>
        
        <div class="tier-explanation tier-${className}">
          <strong>Why This Matters:</strong>
          <p>${tierInfo.description}</p>
          <p class="guidance-text">${tierInfo.guidance}</p>
        </div>
        
        ${rulesHtml}
      </div>
    `;
  }

  renderRuleGroup(ruleName, group, tierClass, fixResults) {
    const fileCount = group.fileCount;
    const occurrenceCount = group.count;
    
    // Aggressive noise reduction for cleanup rules
    const shouldSummarize = tierClass === 'cleanup' && occurrenceCount > 10;
    
    let violationsContent = '';
    
    if (shouldSummarize) {
      violationsContent = this.renderFileSummary(group.files);
    } else {
      // For security/important issues, show sample violations
      violationsContent = this.renderIndividualViolations(group.instances, occurrenceCount, fixResults);
    }

    return `
      <div class="rule-block tier-${tierClass}">
        <div class="rule-header-row">
          <div class="rule-info">
            <div class="rule-title">${ruleName}</div>
            <div class="rule-meta">
              <span class="severity-badge ${group.severity.toLowerCase()}">${group.severity}</span>
              <span class="occurrence-info">
                ${fileCount} file(s) affected • ${occurrenceCount} occurrence(s) total
              </span>
            </div>
          </div>
          <div class="rule-total">
            <div style="font-size: 0.5em; color: #95a5a6; text-transform: uppercase;">Findings</div>
            <div>${fileCount}</div>
          </div>
        </div>
        
        <div class="remediation-box">
          <strong>🔧 Recommended Action:</strong> ${group.remediation}
          <div style="margin-top: 8px; font-size: 0.9em; color: #6c757d;">
            <strong>Impact:</strong> This rule has been detected in ${fileCount} file(s) with ${occurrenceCount} total occurrence(s).
          </div>
        </div>
        
        ${violationsContent}
      </div>
    `;
  }

  renderFileSummary(files) {
    // For cleanup rules: show top affected files only
    const sortedFiles = Object.entries(files).sort((a, b) => b[1].count - a[1].count);
    const displayLimit = 8;
    const topFiles = sortedFiles.slice(0, displayLimit);
    const remaining = sortedFiles.length - displayLimit;
    
    const fileItems = topFiles.map(([filePath, fileData]) => {
      return `<li><strong>${filePath}</strong>: ${fileData.count} occurrence(s)</li>`;
    }).join('');
    
    return `
      <div class="file-summary-box">
        <p class="summary-heading"><strong>📁 Top affected files (cleanup recommended):</strong></p>
        <ul class="file-list">${fileItems}</ul>
        ${remaining > 0 ? `<p class="more-files">...and ${remaining} more file(s)</p>` : ''}
      </div>
    `;
  }

  renderIndividualViolations(instances, totalCount, fixResults) {
    // Show sample locations (limited)
    const displayLimit = 3;
    const displayCount = Math.min(instances.length, displayLimit);
    const shown = instances.slice(0, displayCount);
    
    const violationItems = shown.map(violation => 
      this.renderSingleViolation(violation, fixResults)
    ).join('');
    
    const remainder = totalCount - displayCount;
    const moreText = remainder > 0 ? 
      `<div class="more-violations">...and ${remainder} more occurrence(s) in this file group</div>` : '';
    
    return violationItems + moreText;
  }

  renderSingleViolation(violation, fixResults) {
    const wasFixed = fixResults.fixed.some(fixItem => 
      fixItem.violation.filePath === violation.filePath && 
      fixItem.violation.line === violation.line &&
      fixItem.violation.rule === violation.rule
    );
    
    const fixedClass = wasFixed ? 'fixed' : '';
    const fixedLabel = wasFixed ? 
      '<span class="fixed-label">FIXED</span>' : '';
    
    const codeSnippet = violation.context?.lineContent ? 
      `<div class="code-snippet">${this.escapeHtml(violation.context.lineContent)}</div>` : '';

    return `
      <div class="violation-item ${violation.severity.toLowerCase()} ${fixedClass}">
        <div class="violation-details">
          <p><strong>📄 File:</strong> ${violation.filePath} ${fixedLabel}</p>
          <p><strong>Location:</strong> <span class="violation-location">Line ${violation.line}, Column ${violation.column}</span></p>
          <p><strong>Description:</strong> ${violation.description}</p>
          ${codeSnippet}
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    const htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, char => htmlEntities[char]);
  }

  getAdditionalStyles() {
    return `
      /* Priority-specific styles loaded from priorityRenderer */
      .priority-banner { background: linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
      .priority-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
      .pcard { background: white; padding: 25px; border-radius: 8px; text-align: center; }
      /* Additional styles omitted for brevity - see full implementation */
    `;
  }
}
