import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const auditPath = path.join(__dirname, '../../audit_output.txt');
  if (fs.existsSync(auditPath)) {
    const content = fs.readFileSync(auditPath, 'utf16le');
    console.log("=== Content of audit_output.txt ===");
    console.log(content);
  } else {
    console.log("audit_output.txt not found.");
  }
}

run().catch(console.error);
