import { SalesforceAnalyzer } from '../src/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runExample() {
  console.log('Running Salesforce Metadata Analysis Example\n');

  const analyzer = new SalesforceAnalyzer({
    targetPath: join(__dirname, 'sample-apex'),
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

