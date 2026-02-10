"""Report generator module for creating HTML output."""

from datetime import datetime
from rules import RULES

class ReportGenerator:
    
    def __init__(self, analyzer, fixer=None):
        self.analyzer = analyzer
        self.fixer = fixer
    
    def create_report(self, output="report.html"):
        print(f"\nGenerating HTML report: {output}")
        
        with open(output, 'w', encoding='utf-8') as f:
            f.write(self._build_html())
        
        print("Report generation completed")
        return output
    
    def _build_html(self):
        """Build complete HTML document."""
        stats = self.analyzer.get_statistics()
        fixed_count = len(self.fixer.fixed_list) if self.fixer else 0
        remaining_count = stats['total_violations'] - fixed_count
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Apex Analysis Report</title>
<style>
body{{font-family:Arial,sans-serif;margin:20px;background:#e9ecef}}
h1{{color:#fff;background:#495057;padding:20px;margin:0}}
h2{{color:#343a40;border-bottom:2px solid #6c757d;padding-bottom:5px}}
.container{{max-width:1200px;margin:auto;background:#fff;padding:20px;box-shadow:0 0 10px rgba(0,0,0,0.1)}}
table{{width:100%;border-collapse:collapse;margin:20px 0}}
th{{background:#6c757d;color:#fff;padding:10px;text-align:left}}
td{{padding:10px;border-bottom:1px solid #dee2e6}}
.fixed{{background:#d4edda;border-left:4px solid #28a745}}
.manual{{background:#fff3cd;border-left:4px solid:#ffc107}}
.stat{{display:inline-block;margin:10px 20px 10px 0;padding:10px 15px;background:#f8f9fa;border-left:3px solid #007bff}}
.stat strong{{display:block;font-size:24px;color:#007bff}}
pre{{background:#212529;color:#f8f9fa;padding:10px;overflow-x:auto}}
</style>
</head>
<body>
<h1>Salesforce Apex Static Analysis Report</h1>
<div class="container">
<p><strong>Generated:</strong> {timestamp}</p>

<h2>Summary</h2>
<div class="stat"><strong>{stats['total_files']}</strong>Files Scanned</div>
<div class="stat"><strong>{stats['total_violations']}</strong>Total Violations</div>
<div class="stat"><strong>{fixed_count}</strong>Auto-Fixed</div>
<div class="stat"><strong>{remaining_count}</strong>Remaining</div>

<h2>Auto-Fixed Issues</h2>
{self._render_fixed_issues()}

<h2>Manual Action Required</h2>
{self._render_manual_issues()}

<h2>File Summary</h2>
{self._render_file_table()}

<hr>
<p style="text-align:center;color:#6c757d">Apex Static Analysis & Remediation Tool</p>
</div>
</body>
</html>'''
        return html
    
    def _render_fixed_issues(self):
        if not self.fixer or not self.fixer.fixed_list:
            return '<p>No issues were automatically fixed.</p>'
        return ''.join([f'<div class="fixed"><strong>{v.rule_name}</strong> - {v.file_path}:{v.line_number}<br>{v.description}<pre>{self._escape(v.code_snippet)}</pre><em>Fix: {v.fix_description}</em></div>' for v in self.fixer.fixed_list])
    
    def _render_manual_issues(self):
        manual = [v for v in self.analyzer.violations if not v.fixed]
        if not manual:
            return '<p>All auto-fixable issues have been resolved!</p>'
        return ''.join([f'<div class="manual"><strong>{v.rule_name}</strong> ({v.severity}) - {v.file_path}:{v.line_number}<br>{v.description}<pre>{self._escape(v.code_snippet)}</pre><em>Action: {RULES.get(v.rule_name).remediation_guidance if RULES.get(v.rule_name) else "Manual review required"}</em></div>' for v in manual])
    
    def _render_file_table(self):
        rows = ''.join([f'<tr><td>{path}</td><td>{sum(1 for v in viols if v.fixed)}</td><td>{len(viols) - sum(1 for v in viols if v.fixed)}</td><td>{len(viols)}</td></tr>' for path, viols in self.analyzer.get_violations_by_file().items()])
        return f'<table><thead><tr><th>File</th><th>Fixed</th><th>Remaining</th><th>Total</th></tr></thead><tbody>{rows}</tbody></table>'
    
    def _escape(self, text):
        return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
