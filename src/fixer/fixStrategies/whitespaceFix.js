export class WhitespaceFix {
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
      const trimmedLine = line.replace(/\s+$/, '');
      
      lines[lineIndex] = trimmedLine;
      
      return {
        success: true,
        content: lines.join('\n'),
        description: 'Removed trailing whitespace'
      };
      
    } catch (error) {
      return {
        success: false,
        reason: error.message
      };
    }
  }
}

