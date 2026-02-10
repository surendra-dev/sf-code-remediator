export class NoTrailingWhitespaceRule {
  constructor() {
    this.name = 'NoTrailingWhitespace';
    this.severity = 'Info';
    this.autoFixable = true;
    this.description = 'Line has trailing whitespace';
  }

  async check(filePath, content) {
    const violations = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      if (line.length > 0 && /\s+$/.test(line)) {
        const trailingSpaces = line.match(/\s+$/)[0].length;
        
        violations.push({
          rule: this.name,
          severity: this.severity,
          filePath,
          line: lineNumber,
          column: line.length - trailingSpaces + 1,
          description: `Line has ${trailingSpaces} trailing whitespace character(s)`,
          autoFixable: this.autoFixable,
          context: {
            trailingSpaces,
            lineContent: line
          }
        });
      }
    }

    return violations;
  }
}

