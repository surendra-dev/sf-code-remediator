export class ApexSOQLInjectionRule {
  constructor() {
    this.name = 'ApexSOQLInjection';
    this.severity = 'Critical';
    this.autoFixable = false;
    this.description = 'Potential SOQL injection vulnerability';
  }

  async check(filePath, content) {
    const violations = [];
    const lines = content.split('\n');
    
    const soqlPattern = /Database\.(query|countQuery|getQueryLocator)\s*\(/gi;
    const stringConcatPattern = /[\+]\s*['"]/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      const matches = line.matchAll(soqlPattern);
      
      for (const match of matches) {
        const statementLines = this.getStatementLines(lines, i);
        const fullStatement = statementLines.join(' ');
        
        if (this.hasPotentialInjection(fullStatement)) {
          violations.push({
            rule: this.name,
            severity: this.severity,
            filePath,
            line: lineNumber,
            column: match.index + 1,
            description: 'Dynamic SOQL with string concatenation detected - potential injection risk',
            autoFixable: this.autoFixable,
            context: {
              lineContent: line.trim()
            }
          });
        }
      }
    }

    return violations;
  }

  hasPotentialInjection(statement) {
    return statement.includes('+') && /['"]\s*\+|\+\s*['"]/.test(statement);
  }

  getStatementLines(lines, startIndex) {
    const result = [lines[startIndex]];
    return result;
  }
}

