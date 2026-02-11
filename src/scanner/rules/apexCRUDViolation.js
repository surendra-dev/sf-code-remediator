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
      /WITH\s+SECURITY_ENFORCED/i,
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
            const specificOp = operation === 'DML' ? this.detectDMLOperation(line) : operation;
            
            violations.push({
              rule: this.name,
              severity: this.severity,
              filePath,
              line: lineNumber,
              column: match.index + 1,
              description: `${specificOp} operation without CRUD/FLS check`,
              autoFixable: operation === 'SOQL' || (this.autoFixable && sobject !== null),
              context: {
                operation: specificOp,
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

  detectDMLOperation(line) {
    if (/\binsert\b/i.test(line)) return 'insert';
    if (/\bupdate\b/i.test(line)) return 'update';
    if (/\bdelete\b/i.test(line)) return 'delete';
    if (/\bupsert\b/i.test(line)) return 'upsert';
    return 'DML';
  }
}

