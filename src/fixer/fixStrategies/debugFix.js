export class DebugFix {
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
      
      let line = lines[lineIndex];
      
      if (line.trim().startsWith('//')) {
        return {
          success: false,
          reason: 'Already commented'
        };
      }
      
      line = line.replace(/System\.debug\s*\([^)]*\)\s*;?/gi, '// System.debug removed');
      
      lines[lineIndex] = line;
      
      return {
        success: true,
        content: lines.join('\n'),
        description: 'Removed System.debug() statement'
      };
      
    } catch (error) {
      return {
        success: false,
        reason: error.message
      };
    }
  }
}

