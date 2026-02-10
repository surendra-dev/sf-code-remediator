export class ApexSharingViolationRule {
  constructor() {
    this.name = 'ApexSharingViolation';
    this.severity = 'High';
    this.autoFixable = true;
    this.description = 'Class without sharing declaration';
  }

  async check(filePath, content) {
    const violations = [];
    const lines = content.split('\n');
    
    const classPattern = /^\s*(public|global)\s+(abstract\s+)?(class|interface)\s+(\w+)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const match = line.match(classPattern);
      
      if (match) {
        const className = match[4];
        const hasSharingKeyword = this.hasSharingKeyword(lines, i);
        
        if (!hasSharingKeyword) {
          violations.push({
            rule: this.name,
            severity: this.severity,
            filePath,
            line: lineNumber,
            column: match.index + 1,
            description: `Class '${className}' missing sharing declaration`,
            autoFixable: this.autoFixable,
            context: {
              className,
              lineContent: line.trim()
            }
          });
        }
      }
    }

    return violations;
  }

  hasSharingKeyword(lines, classLineIndex) {
    const checkRange = Math.max(0, classLineIndex - 3);
    
    for (let i = checkRange; i <= classLineIndex; i++) {
      if (/\b(with sharing|without sharing|inherited sharing)\b/.test(lines[i])) {
        return true;
      }
    }
    return false;
  }
}

