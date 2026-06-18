import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = path.join(__dirname, '../../events_dump.txt');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log("=== Content of events_dump.txt ===");
    console.log(content);
  } else {
    console.log("events_dump.txt not found.");
  }
}

run().catch(console.error);
