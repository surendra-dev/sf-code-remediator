/**
 * Salesforce Security Scanner Style Renderer
 * Generates reports matching the reference specification format
 */

export class SalesforceQueryRenderer {
  constructor() {
    this.queryMapping = {
      'ApexSOQLInjection': {
        queryName: 'SOQL SOSL Injection',
        group: 'Apex Critical Security Risk',
        description: 'This query detects user controlled input entering the structure of a SOQL query in Apex. Unlike queries sent via the REST or SOAP API, queries in Apex do not enforce CRUD or FLS checks, and therefore letting the user inject their own SOQL code can lead to unauthorized data access. This is even true if the user can only influence fields in WHERE clauses. To fix this vulnerability, make sure that user controlled data that is in a quoted context is entered into the query via a bound variable, or is otherwise sanitized with String.escapeSingleQuotes method. For data that is not quoted it must be of a safe data type, such as integer or Id. All other user data must be checked by manually performing CRUD or FLS checks or matching against a whitelist.',
        references: ['https://developer.salesforce.com/docs/atlas.en-us.secure_coding_guide.meta/secure_coding_guide/secure_coding_sql_injection.htm']
      },
      'ApexCRUDViolation': {
        queryName: 'FLS Update',
        group: 'Apex Serious Security Risk',
        description: 'This query looks for data modification operations that are performed without checking for isUpdateable. This may be a false positive if your code accesses only objects whose security is managed by your app and not the admin. It may also be a false positive if checks are performed outside of the dataflow, automatically in a visualforce inputfield tag or manually in a constructor, or if this is an enterprise object or other object whose permissions are not set by the admin.',
        references: [
          'https://developer.salesforce.com/docs/atlas.en-us.securityImplGuide.meta/securityImplGuide/review_and_certification.htm',
          'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_perms_enforcing.htm'
        ]
      },
      'ApexSharingViolation': {
        queryName: 'Sharing',
        group: 'Apex Serious Security Risk',
        description: 'This query detects classes that do not specify a sharing model. Without explicit sharing declarations, Apex classes run in system context and bypass record-level security.',
        references: ['https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_keywords_sharing.htm']
      },
      'NoTrailingWhitespace': {
        queryName: 'Trailing Whitespace',
        group: 'Code Quality',
        description: 'Detects trailing whitespace at the end of lines.',
        references: []
      },
      'AvoidDebugStatements': {
        queryName: 'Debug Statements',
        group: 'Code Quality',
        description: 'Detects System debug statements that should be removed before production.',
        references: []
      },
      'CognitiveComplexity': {
        queryName: 'Cognitive Complexity',
        group: 'Apex Code Quality',
        description: 'Detects methods with high cognitive complexity.',
        references: []
      }
    };
  }

  renderReport(scanResults, prioritizedResults) {
    const metadata = this.generateMetadata(scanResults);
    const querySummary = this.aggregateByQuery(prioritizedResults || scanResults);
    
    return {
      metadata,
      querySummary,
      html: this.generateHtml(metadata, querySummary)
    };
  }

  generateMetadata(scanResults) {
    const now = new Date();
    const scanId = `SF${now.getTime().toString(36).toUpperCase()}`;
    
    return {
      jobType: 'LOCAL_SCAN',
      preset: 'Security',
      scanId: scanId,
      description: 'Salesforce Static Analysis',
      emailAddress: 'security@salesforce.com',
      securityIssues: this.countSecurityIssues(scanResults),
      qualityIssues: this.countQualityIssues(scanResults),
      serviceVersion: 'v1.0',
      scanStart: now.toISOString(),
      scanEnd: now.toISOString()
    };
  }

  countSecurityIssues(scanResults) {
    const securityRules = ['ApexSOQLInjection', 'ApexCRUDViolation', 'ApexSharingViolation'];
    return (scanResults.violations || []).filter(v => 
      securityRules.includes(v.rule)
    ).length;
  }

  countQualityIssues(scanResults) {
    const qualityRules = ['NoTrailingWhitespace', 'AvoidDebugStatements', 'CognitiveComplexity'];
    return (scanResults.violations || []).filter(v => 
      qualityRules.includes(v.rule)
    ).length;
  }

  aggregateByQuery(results) {
    const violations = results.violations || results.original?.violations || [];
    const queryGroups = {};

    for (const violation of violations) {
      const mapping = this.queryMapping[violation.rule];
      if (!mapping) continue;

      const queryKey = mapping.queryName;
      if (!queryGroups[queryKey]) {
        queryGroups[queryKey] = {
          queryName: mapping.queryName,
          group: mapping.group,
          description: mapping.description,
          references: mapping.references,
          issueCount: 0,
          resultPaths: []
        };
      }

      queryGroups[queryKey].issueCount++;
      queryGroups[queryKey].resultPaths.push(violation);
    }

    for (const query of Object.values(queryGroups)) {
      query.resultPaths = this.groupResultPaths(query.resultPaths);
    }

    return queryGroups;
  }

  groupResultPaths(violations) {
    const grouped = {};
    
    for (const violation of violations) {
      const key = `${violation.filePath}-${violation.rule}`;
      if (!grouped[key]) {
        grouped[key] = {
          similarityId: this.generateSimilarityId(violation),
          violations: []
        };
      }
      grouped[key].violations.push(violation);
    }

    return Object.values(grouped);
  }

  generateSimilarityId(violation) {
    const str = `${violation.filePath}${violation.rule}${violation.line}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  generateHtml(metadata, querySummary) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Force.com Source Scanner Results</title>
    ${this.getStyles()}
</head>
<body>
    ${this.renderHeader(metadata)}
    ${this.renderSummaryTable(querySummary)}
    ${this.renderQueryDetails(querySummary)}
</body>
</html>`;
  }

  getStyles() {
    return `<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333; background: #fff; }
.container-fluid { width: 100%; padding: 0 15px; }
.row { display: flow-root; margin: 0 -15px; }
.row > [class*="col-"] { float: left; padding: 0 15px; min-height: 1px; }
.col-xs-10 { width: 83.33%; }
.col-xs-9 { width: 75%; }
.col-xs-6 { width: 50%; }
.col-xs-4 { width: 33.33%; }
.col-xs-3 { width: 25%; }
.col-xs-offset-1 { margin-left: 8.33%; }
.col-xs-offset-2 { margin-left: 16.67%; }
.panel { background: #fff; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.panel-primary { border-color: #337ab7; }
.panel-primary > .panel-heading { color: #fff; background: #337ab7; border-color: #337ab7; }
.panel-heading { padding: 10px 15px; border-bottom: 1px solid transparent; border-radius: 3px 3px 0 0; }
.panel-heading h3 { margin: 0; font-size: 18px; }
.panel-body { padding: 15px; }
.panel-body .row { margin-bottom: 8px; }
.panel-footer { padding: 10px 15px; background: #f5f5f5; border-top: 1px solid #ddd; border-radius: 0 0 3px 3px; }
.table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
.table th, .table td { padding: 8px; border-top: 1px solid #ddd; text-align: left; }
.table th { background: #f9f9f9; border-bottom: 2px solid #ddd; font-weight: bold; }
.table-hover tbody tr:hover { background: #f5f5f5; }
pre { display: block; padding: 9px; margin: 0 0 10px; font-size: 13px; color: #333; background: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
code { padding: 2px 4px; font-size: 90%; color: #c7254e; background: #f9f2f4; border-radius: 3px; font-family: monospace; }
h3 { font-size: 24px; margin: 20px 0 10px; font-weight: 500; }
h5 { font-size: 14px; margin: 10px 0; font-weight: 500; }
strong { font-weight: bold; }
a { color: #337ab7; text-decoration: none; }
a:hover { color: #23527c; text-decoration: underline; }
.top-half { margin-top: 20px; }
.bottom-half { margin-bottom: 20px; }
.help-block { display: block; margin: 5px 0 10px; color: #737373; font-size: 13px; }
.pull-right { float: right; }
small { font-size: 85%; }
</style>`;
  }

  renderHeader(metadata) {
    const formatDate = (iso) => {
      const d = new Date(iso);
      return d.toLocaleString('en-US', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
      }).replace(',', '');
    };

    return `<div class="container-fluid">
  <div class="row">
    <div class="col-xs-10 col-xs-offset-1">
      <div class="panel panel-primary">
        <div class="panel-heading"><h3>Force.com Source Scanner Results</h3></div>
        <div class="panel-body">
          <div class="row">
            <div class="col-xs-4 col-xs-offset-1"><strong>Job Type:</strong> ${metadata.jobType}</div>
            <div class="col-xs-3"><strong>Preset:</strong> ${metadata.preset}</div>
            <div class="col-xs-3"><span class="pull-right"><strong>Scan Id:</strong> ${metadata.scanId}</span></div>
          </div>
          <div class="row">
            <div class="col-xs-10 col-xs-offset-1">
              <strong>Description:</strong> ${metadata.description}
              <span class="pull-right"><strong>Email Address:</strong> ${metadata.emailAddress}</span>
            </div>
          </div>
          <div class="row">
            <div class="col-xs-4 col-xs-offset-1"><strong>Security Issues: </strong>${metadata.securityIssues}</div>
            <div class="col-xs-3"><strong>Service Version: </strong>${metadata.serviceVersion}</div>
            <div class="col-xs-3"><span class="pull-right"><strong>Scan Start: </strong>${formatDate(metadata.scanStart)}</span></div>
          </div>
          <div class="row">
            <div class="col-xs-4 col-xs-offset-1"><strong>Quality Issues: </strong>${metadata.qualityIssues}</div>
            <div class="col-xs-3"></div>
            <div class="col-xs-3"><span class="pull-right"><strong>Scan End: </strong>${formatDate(metadata.scanEnd)}</span></div>
          </div>
        </div>
        <div class="panel-footer">
          <div class="row">
            <div class="col-xs-10">For questions about this service, please consult the Salesforce Security documentation.</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  }

  renderSummaryTable(querySummary) {
    const queries = Object.values(querySummary);
    if (queries.length === 0) {
      return `<div class="row"><div class="col-xs-10 col-xs-offset-1"><p>No issues found.</p></div></div>`;
    }

    const rows = queries.map(query => {
      const anchorId = `query_${query.queryName.replace(/\s+/g, '_')}`;
      return `<tr><td><a href="#${anchorId}">${query.queryName}</a></td><td>${query.group}</td><td>${query.issueCount}</td></tr>`;
    }).join('\n');

    return `<div class="row"><div class="col-xs-10 col-xs-offset-1"><table class="table table-hover table-responsive">
<tr><th>Query</th><th>Group</th><th>Issues</th></tr>
${rows}
</table></div></div>`;
  }

  renderQueryDetails(querySummary) {
    return Object.values(querySummary).map(query => {
      const anchorId = `query_${query.queryName.replace(/\s+/g, '_')}`;
      const pathsHtml = query.resultPaths.map((path, idx) => 
        this.renderResultPath(path, idx + 1, query.queryName)
      ).join('\n');

      let referencesHtml = '';
      if (query.references.length > 0) {
        const refLinks = query.references.map(ref => 
          `<div class="row"><div class="col-xs-9 col-xs-offset-2"><a href="${ref}">${ref}</a></div></div>`
        ).join('\n');
        referencesHtml = `<div class="row top-half"><div class="col-xs-10 col-xs-offset-1"><strong>Reference:</strong></div></div>\n${refLinks}\n`;
      }

      return `<div class="row top-half"><div class="col-xs-10 col-xs-offset-1"><h3><a name="${anchorId}" href="#results_table"> Query: ${query.queryName}</a></h3>
</div></div><div class="row top-half"><div class="col-xs-10 col-xs-offset-1">${query.description}</div></div>${referencesHtml}<div class="row bottom-half"></div>
${pathsHtml}`;
    }).join('\n');
  }

  renderResultPath(path, pathNumber, queryName) {
    const violations = path.violations.slice(0, 3);
    const stepsHtml = violations.map(v => {
      const lineContent = v.context?.lineContent || v.description;
      return `<div class="row"><div class="col-xs-9 col-xs-offset-2"><div class="help-block">Object: <code>${v.rule.toLowerCase()}</code> in file: <code>${v.filePath}</code></div></div></div>
<div class="row"><div class="col-xs-9 col-xs-offset-2"><pre>L ${v.line}: ${this.escapeHtml(lineContent)}</pre></div></div>`;
    }).join('\n');

    return `<div class="row top-half"><div class="col-xs-6 col-xs-offset-1"><h5>${queryName} result path ${pathNumber}: </h5></div><div class="col-xs-3 col-xs-offset-1"><span class="help-block"><small>Similarity Id: ${path.similarityId}</small></span></div></div>
${stepsHtml}`;
  }

  escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }
}
