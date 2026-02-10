import { readFile, copyFile, unlink } from 'fs/promises';
import { ApexScanner } from '../scanner/apexScanner.js';

export class Verifier {
  constructor(targetPath) {
    this.targetPath = targetPath;
  }

  async verify(originalScanResults, fixResults) {
    const verified = [];
    const newViolations = [];
    const rollbacks = [];

    if (fixResults.updatedFiles.length === 0) {
      return { verified, newViolations, rollbacks };
    }

    const scanner = new ApexScanner(this.targetPath);
    const newScanResults = await scanner.scan();

    for (const fixedItem of fixResults.fixed) {
      const originalViolation = fixedItem.violation;
      const stillExists = this.violationStillExists(newScanResults.violations, originalViolation);

      if (!stillExists) {
        verified.push(fixedItem);
      }
    }

    for (const filePath of fixResults.updatedFiles) {
      const originalFileViolations = originalScanResults.fileViolations[filePath] || [];
      const newFileViolations = newScanResults.fileViolations[filePath] || [];

      const introducedViolations = this.findIntroducedViolations(
        originalFileViolations,
        newFileViolations
      );

      if (introducedViolations.length > 0) {
        newViolations.push(...introducedViolations);
        
        const rollbackSuccess = await this.rollbackFile(filePath);
        if (rollbackSuccess) {
          rollbacks.push({
            filePath,
            reason: 'Introduced new violations',
            violationsIntroduced: introducedViolations.length
          });
        }
      }
    }

    return {
      verified,
      newViolations,
      rollbacks
    };
  }

  violationStillExists(newViolations, originalViolation) {
    return newViolations.some(v =>
      v.rule === originalViolation.rule &&
      v.filePath === originalViolation.filePath &&
      Math.abs(v.line - originalViolation.line) <= 5
    );
  }

  findIntroducedViolations(originalViolations, newViolations) {
    const introduced = [];

    for (const newViolation of newViolations) {
      const existedBefore = originalViolations.some(v =>
        v.rule === newViolation.rule &&
        Math.abs(v.line - newViolation.line) <= 5
      );

      if (!existedBefore) {
        introduced.push(newViolation);
      }
    }

    return introduced;
  }

  async rollbackFile(filePath) {
    const backupPath = `${filePath}.backup`;
    try {
      await copyFile(backupPath, filePath);
      await unlink(backupPath);
      return true;
    } catch (error) {
      console.error(`Failed to rollback ${filePath}:`, error.message);
      return false;
    }
  }
}

