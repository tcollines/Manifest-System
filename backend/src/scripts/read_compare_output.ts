import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = path.join(__dirname, '../../compare_output.txt');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf16le');
    console.log("=== Content of compare_output.txt ===");
    console.log(content.split('\n').slice(0, 100).join('\n'));
  } else {
    console.log("compare_output.txt not found.");
  }
}

run().catch(console.error);
