import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = path.join(__dirname, '../../manifest_pre_phase_3b_2026-02-10T14-15-33-844Z.json');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const ids = ['s-1770145860115', 's-1769946877871'];
    for (const id of ids) {
      console.log(`\n--- Searching for ${id} ---`);
      let pos = 0;
      let count = 0;
      while ((pos = content.indexOf(id, pos)) !== -1) {
        count++;
        const start = Math.max(0, pos - 150);
        const end = Math.min(content.length, pos + 150);
        console.log(`Match ${count} at position ${pos}:`);
        console.log(content.substring(start, end));
        pos += id.length;
      }
      if (count === 0) {
        console.log("No substring match found.");
      }
    }
  } else {
    console.log("Backup JSON not found.");
  }
}

run().catch(console.error);
