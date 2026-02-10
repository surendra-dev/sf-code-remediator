export class ApexCRUDViolationRule {
  constructor() {
    this.name = 'ApexCRUDViolation';
    this.severity = 'Critical';
    this.autoFixable = true;
    this.description = 'DML operation without CRUD/FLS security check';
  }

  async check(filePath, content) {
    const violations = [];
    const lines = content.split('\n');
    
    const dmlPatterns = [
      { pattern: /\b(insert|update|delete|upsert)\s+/gi, operation: 'DML' },
      { pattern: /\[SELECT\s+/gi, operation: 'SOQL' }
    ];

    const securityCheckPatterns = [
      /Schema\.sObjectType\.\w+\.fields\.\w+\.isAccessible\(\)/,
      /Schema\.sObjectType\.\w+\.fields\.\w+\.isCreateable\(\)/,
      /Schema\.sObjectType\.\w+\.fields\.\w+\.isUpdateable\(\)/,
      /Schema\.sObjectType\.\w+\.isDeletable\(\)/,
      /isAccessible\(\)/,
      /isCreateable\(\)/,
      /isUpdateable\(\)/,
      /isDeletable\(\)/
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      for (const { pattern, operation } of dmlPatterns) {
        const matches = line.matchAll(pattern);
        
        for (const match of matches) {
          const hasSecurityCheck = this.hasSecurityCheckNearby(lines, i, securityCheckPatterns);
          
          if (!hasSecurityCheck) {
            const sobject = this.extractSObject(line);
            
            violations.push({
              rule: this.name,
              severity: this.severity,
              filePath,
              line: lineNumber,
              column: match.index + 1,
              description: `${operation} operation without CRUD/FLS check`,
              autoFixable: this.autoFixable && sobject !== null,
              context: {
                operation,
                sobject,
                lineContent: line.trim()
              }
            });
          }
        }
      }
    }

    return violations;
  }

  hasSecurityCheckNearby(lines, currentIndex, patterns, range = 10) {
    const start = Math.max(0, currentIndex - range);
    const end = Math.min(lines.length, currentIndex + range);
    
    for (let i = start; i < end; i++) {
      const line = lines[i];
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          return true;
        }
      }
    }
    
    return false;
  }

  extractSObject(line) {
    const match = line.match(/\b(insert|update|delete|upsert)\s+(\w+)/i);
    return match ? match[2] : null;
  }
}

