import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = path.join(__dirname, '../../manifest_pre_phase_3b_2026-02-10T14-15-33-844Z.json');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log("Searching for station IDs in JSON backup...");
    
    // Find matching objects
    const data = JSON.parse(content);
    const matches: any[] = [];
    function traverse(obj: any) {
      if (typeof obj === 'object' && obj !== null) {
        const str = JSON.stringify(obj);
        if (str.includes('s-1769946877871') || str.includes('s-1770145860115')) {
          matches.push(obj);
        } else {
          for (const v of Object.values(obj)) {
            traverse(v);
          }
        }
      }
    }
    traverse(data);
    console.log(`Found ${matches.length} matching objects.`);
    matches.slice(0, 5).forEach((m, idx) => {
      console.log(`Match ${idx+1}:`, JSON.stringify(m, null, 2));
    });
  } else {
    console.log("manifest_pre_phase_3b... json not found.");
  }
}

run().catch(console.error);
