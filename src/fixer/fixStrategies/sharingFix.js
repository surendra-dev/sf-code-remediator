export class SharingFix {
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
      const classMatch = line.match(/^(\s*)(public|global)\s+(abstract\s+)?(class|interface)\s+(\w+)/);
      
      if (!classMatch) {
        return {
          success: false,
          reason: 'Cannot parse class declaration'
        };
      }
      
      const indentation = classMatch[1];
      const visibility = classMatch[2];
      const abstractKeyword = classMatch[3] || '';
      const classType = classMatch[4];
      const className = classMatch[5];
      
      const newLine = `${indentation}${visibility} with sharing ${abstractKeyword}${classType} ${className}`;
      
      lines[lineIndex] = line.replace(classMatch[0], newLine);
      
      return {
        success: true,
        content: lines.join('\n'),
        description: `Added 'with sharing' to class ${className}`
      };
      
    } catch (error) {
      return {
        success: false,
        reason: error.message
      };
    }
  }
}

