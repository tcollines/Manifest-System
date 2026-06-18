import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = path.join(__dirname, '../../manifest_pre_phase_3b_2026-02-10T14-15-33-844Z.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log("Searching in pre-phase 3b JSON for other coordinator names...");
    
    const matches: any[] = [];
    function traverse(obj: any) {
      if (typeof obj === 'object' && obj !== null) {
        const str = JSON.stringify(obj);
        if (str.includes('Kiboneka Peter') || str.includes('Eric Mugerwa') || str.includes('Mukasa Joseph')) {
          matches.push(obj);
        } else {
          for (const v of Object.values(obj)) {
            traverse(v);
          }
        }
      }
    }
    
    traverse(data);
    console.log(`Found ${matches.length} matching objects in backup JSON.`);
    // Print the first few matches
    matches.slice(0, 10).forEach((m, idx) => {
      console.log(`Match ${idx + 1}:`, JSON.stringify(m, null, 2));
    });
  } else {
    console.log("manifest_pre_phase_3b... json not found.");
  }
}

run().catch(console.error);
