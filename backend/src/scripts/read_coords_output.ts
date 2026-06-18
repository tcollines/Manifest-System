import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = path.join(__dirname, '../../coords_output.txt');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf16le');
    console.log("=== Content of coords_output.txt ===");
    console.log(content);
  } else {
    console.log("coords_output.txt not found.");
  }
}

run().catch(console.error);
