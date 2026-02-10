export class CRUDFix {
  async apply(content, violation) {
    try {
      const lines = content.split('\n');
      const lineIndex = violation.line - 1;
      
      if (lineIndex < 0 || lineIndex >= lines.length) {
        return {
          success: false,
          reason: 'Invalid line number'
        };
      }
      
      const line = lines[lineIndex];
      const context = violation.context;
      
      if (!context || !context.sobject) {
        return {
          success: false,
          reason: 'Cannot determine SObject type'
        };
      }
      
      const operation = this.detectOperation(line);
      const checkCode = this.generateSecurityCheck(context.sobject, operation);
      
      if (!checkCode) {
        return {
          success: false,
          reason: 'Cannot generate security check'
        };
      }
      
      const indentation = this.getIndentation(line);
      const securityCheckLines = checkCode.split('\n').map(l => indentation + l);
      
      lines.splice(lineIndex, 0, ...securityCheckLines);
      
      return {
        success: true,
        content: lines.join('\n'),
        description: `Added ${operation} security check for ${context.sobject}`
      };
      
    } catch (error) {
      return {
        success: false,
        reason: error.message
      };
    }
  }

  detectOperation(line) {
    if (/\binsert\b/i.test(line)) return 'insert';
    if (/\bupdate\b/i.test(line)) return 'update';
    if (/\bdelete\b/i.test(line)) return 'delete';
    if (/\bupsert\b/i.test(line)) return 'upsert';
    if (/\[SELECT\b/i.test(line)) return 'read';
    return 'access';
  }

  generateSecurityCheck(sobject, operation) {
    switch (operation) {
      case 'insert':
        return `if (!Schema.sObjectType.${sobject}.isCreateable()) {\n    throw new System.NoAccessException();\n}`;
      case 'update':
        return `if (!Schema.sObjectType.${sobject}.isUpdateable()) {\n    throw new System.NoAccessException();\n}`;
      case 'delete':
        return `if (!Schema.sObjectType.${sobject}.isDeletable()) {\n    throw new System.NoAccessException();\n}`;
      case 'upsert':
        return `if (!Schema.sObjectType.${sobject}.isCreateable() || !Schema.sObjectType.${sobject}.isUpdateable()) {\n    throw new System.NoAccessException();\n}`;
      case 'read':
        return `if (!Schema.sObjectType.${sobject}.isAccessible()) {\n    throw new System.NoAccessException();\n}`;
      default:
        return `if (!Schema.sObjectType.${sobject}.isAccessible()) {\n    throw new System.NoAccessException();\n}`;
    }
  }

  getIndentation(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }
}

