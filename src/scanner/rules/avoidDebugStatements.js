export class AvoidDebugStatementsRule {
  constructor() {
    this.name = 'AvoidDebugStatements';
    this.severity = 'Low';
    this.autoFixable = true;
    this.description = 'System.debug() statements should be removed in production code';
  }

  async check(filePath, content) {
    const violations = [];
    const lines = content.split('\n');
    
    const debugPattern = /System\.debug\s*\(/gi;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      const matches = line.matchAll(debugPattern);
      
      for (const match of matches) {
        if (!this.isCommented(line, match.index)) {
          violations.push({
            rule: this.name,
            severity: this.severity,
            filePath,
            line: lineNumber,
            column: match.index + 1,
            description: 'System.debug() statement found',
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

  isCommented(line, index) {
    const beforeMatch = line.substring(0, index);
    return beforeMatch.includes('//');
  }
}

