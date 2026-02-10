export class CognitiveComplexityRule {
  constructor() {
    this.name = 'CognitiveComplexity';
    this.severity = 'Moderate';
    this.autoFixable = false;
    this.threshold = 15;
    this.description = 'Method has high cognitive complexity';
  }

  async check(filePath, content) {
    const violations = [];
    const lines = content.split('\n');
    
    const methodPattern = /^\s*(public|private|protected|global)\s+(static\s+)?(\w+)\s+(\w+)\s*\(/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const match = line.match(methodPattern);
      
      if (match) {
        const methodName = match[4];
        const methodBody = this.extractMethodBody(lines, i);
        const complexity = this.calculateComplexity(methodBody);
        
        if (complexity > this.threshold) {
          violations.push({
            rule: this.name,
            severity: this.severity,
            filePath,
            line: lineNumber,
            column: match.index + 1,
            description: `Method '${methodName}' has cognitive complexity of ${complexity} (threshold: ${this.threshold})`,
            autoFixable: this.autoFixable,
            context: {
              methodName,
              complexity,
              threshold: this.threshold
            }
          });
        }
      }
    }

    return violations;
  }

  extractMethodBody(lines, startIndex) {
    const body = [];
    let braceCount = 0;
    let started = false;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      if (started) {
        body.push(line);
      }
      
      if (started && braceCount === 0) {
        break;
      }
    }
    
    return body.join('\n');
  }

  calculateComplexity(methodBody) {
    const complexityPatterns = [/\bif\s*\(/, /\belse\s+if\b/, /\bfor\s*\(/, /\bwhile\s*\(/, /\bcatch\s*\(/, /\?\s*.*\s*:/];
    let complexity = 0;
    
    for (const pattern of complexityPatterns) {
      const matches = methodBody.match(new RegExp(pattern.source, 'g'));
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }
}

