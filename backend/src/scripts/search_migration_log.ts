import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const logPath = path.join(__dirname, '../../migration_log.txt');
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf16le');
    console.log("=== Matches in migration_log.txt ===");
    content.split('\n').forEach((line, idx) => {
      if (line.includes('6ef635f1-d285-4188-baca-612c8a19e4db') || line.includes('Jose')) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    });
  } else {
    console.log("migration_log.txt not found.");
  }
}

run().catch(console.error);
