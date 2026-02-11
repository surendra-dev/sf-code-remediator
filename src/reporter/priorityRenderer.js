/**
 * Priority-based HTML rendering for scan results
 * Transforms prioritized results into actionable HTML sections
 */

export class PriorityRenderer {
  
  renderSummaryBanner(prioritizedResults) {
    const summary = prioritizedResults.summary;
    
    return `
      <div class="priority-banner">
        <h2 class="banner-title">Priority Summary</h2>
        <p class="banner-subtitle">What should I fix FIRST, and why?</p>
        
        <div class="priority-cards">
          <div class="pcard critical-card">
            <div class="card-icon">CRITICAL</div>
            <div class="card-number">${summary.critical}</div>
            <div class="card-label">Critical - Fix First</div>
            <div class="card-info">Security and data access risks</div>
          </div>
          
          <div class="pcard important-card">
            <div class="card-icon">IMPORTANT</div>
            <div class="card-number">${summary.important}</div>
            <div class="card-label">Important - Plan Fix</div>
            <div class="card-info">Performance and stability risks</div>
          </div>
          
          <div class="pcard cleanup-card">
            <div class="card-icon">CLEANUP</div>
            <div class="card-number">${summary.cleanup}</div>
            <div class="card-label">Cleanup - Auto-Fixable</div>
            <div class="card-info">Style and hygiene issues</div>
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
    
    const sortedRules = Object.entries(ruleGroups).sort((a, b) => b[1].count - a[1].count);
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
    const fileCount = Object.keys(group.files).length;
    const shouldSummarize = tierClass === 'cleanup' && group.count > 20;
    
    let violationsContent = '';
    
    if (shouldSummarize) {
      violationsContent = this.renderFileSummary(group.files);
    } else {
      violationsContent = this.renderIndividualViolations(group.instances, group.count, fixResults);
    }

    return `
      <div class="rule-block tier-${tierClass}">
        <div class="rule-header-row">
          <div class="rule-info">
            <div class="rule-title">${ruleName}</div>
            <div class="rule-meta">
              <span class="severity-badge ${group.severity.toLowerCase()}">${group.severity}</span>
              <span class="occurrence-info">${group.count} occurrence(s) in ${fileCount} file(s)</span>
            </div>
          </div>
          <div class="rule-total">${group.count}</div>
        </div>
        
        <div class="remediation-box">
          <strong>Recommended Action:</strong> ${group.remediation}
        </div>
        
        ${violationsContent}
      </div>
    `;
  }

  renderFileSummary(files) {
    const sortedFiles = Object.entries(files).sort((a, b) => b[1].count - a[1].count);
    const topFiles = sortedFiles.slice(0, 10);
    const remaining = sortedFiles.length - 10;
    
    const fileItems = topFiles.map(([filePath, fileData]) => {
      const fileName = filePath.split('/').pop();
      return `<li><strong>${fileName}</strong>: ${fileData.count} occurrence(s)</li>`;
    }).join('');
    
    return `
      <div class="file-summary-box">
        <p class="summary-heading"><strong>Top affected files:</strong></p>
        <ul class="file-list">${fileItems}</ul>
        ${remaining > 0 ? `<p class="more-files">...and ${remaining} more file(s)</p>` : ''}
      </div>
    `;
  }

  renderIndividualViolations(instances, totalCount, fixResults) {
    const displayCount = Math.min(instances.length, 5);
    const shown = instances.slice(0, displayCount);
    
    const violationItems = shown.map(violation => 
      this.renderSingleViolation(violation, fixResults)
    ).join('');
    
    const remainder = totalCount - displayCount;
    const moreText = remainder > 0 ? 
      `<div class="more-violations">...and ${remainder} more occurrence(s)</div>` : '';
    
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
    
    const fileName = violation.filePath.split('/').pop();
    const codeSnippet = violation.context?.lineContent ? 
      `<div class="code-snippet">${this.escapeHtml(violation.context.lineContent)}</div>` : '';

    return `
      <div class="violation-item ${violation.severity.toLowerCase()} ${fixedClass}">
        <div class="violation-details">
          <p><strong>File:</strong> ${fileName} ${fixedLabel}</p>
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
