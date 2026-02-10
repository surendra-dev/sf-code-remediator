import { SalesforceAnalyzer } from '../src/index.js';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolves the target path for Salesforce metadata analysis.
 * Priority order:
 * 1. Command-line argument
 * 2. Config file (sf-remediator.config.json)
 * 3. Default fallback (sample-apex)
 * 
 * @returns {string} Resolved absolute path to the target directory
 */
function resolveTargetPath() {
  // Priority 1: Command-line argument
  const cliArg = process.argv[2];
  if (cliArg) {
    const resolvedPath = resolve(cliArg);
    if (existsSync(resolvedPath)) {
      console.log(`Using target path from CLI argument: ${resolvedPath}`);
      return resolvedPath;
    } else {
      console.error(`Error: CLI argument path does not exist: ${resolvedPath}`);
      process.exit(1);
    }
  }

  // Priority 2: Config file
  const configPath = resolve(__dirname, '../sf-remediator.config.json');
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      if (config.targetPath) {
        const resolvedPath = resolve(__dirname, '..', config.targetPath);
        if (existsSync(resolvedPath)) {
          console.log(`Using target path from config file: ${resolvedPath}`);
          return resolvedPath;
        } else {
          console.error(`Error: Config file path does not exist: ${resolvedPath}`);
          process.exit(1);
        }
      }
    } catch (error) {
      console.error(`Error reading config file: ${error.message}`);
      process.exit(1);
    }
  }

  // Priority 3: Default fallback
  const defaultPath = join(__dirname, 'sample-apex');
  if (existsSync(defaultPath)) {
    console.log(`Using default target path: ${defaultPath}`);
    return defaultPath;
  }

  // No valid path found
  console.error('Error: No valid target path found. Please provide a path via:');
  console.error('  1. CLI argument: node examples/run-analysis.js <path>');
  console.error('  2. Config file: sf-remediator.config.json in repository root');
  console.error('  3. Default: examples/sample-apex directory');
  process.exit(1);
}

async function runExample() {
  console.log('Running Salesforce Metadata Analysis Example\n');

  const analyzer = new SalesforceAnalyzer({
    targetPath: resolveTargetPath(),
    autoFix: true,
    outputDir: join(__dirname, '../reports')
  });

  try {
    const results = await analyzer.run();
    
    console.log('\nExample completed successfully!');
    console.log('Check the report at:', results.reportPath);
    
  } catch (error) {
    console.error('Error running example:', error);
    process.exit(1);
  }
}

runExample();

