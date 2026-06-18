import * as fs from 'fs';
import * as path from 'path';

function searchFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.toLowerCase().includes('lukodda')) {
      console.log(`\n=== File: ${filePath} ===`);
      // If it's json, let's parse and search for Lukodda Joseph
      if (filePath.endsWith('.json')) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const matches = parsed.filter(item => 
            JSON.stringify(item).toLowerCase().includes('lukodda')
          );
          console.log(JSON.stringify(matches, null, 2));
        } else {
          // If it's a nested object, check keys
          const matches: any[] = [];
          function traverse(obj: any) {
            if (typeof obj === 'object' && obj !== null) {
              if (obj.name && obj.name.toLowerCase().includes('lukodda')) {
                matches.push(obj);
              } else {
                for (const v of Object.values(obj)) {
                  traverse(v);
                }
              }
            }
          }
          traverse(parsed);
          console.log(JSON.stringify(matches, null, 2));
        }
      } else {
        // Just print lines containing Lukodda
        content.split('\n').forEach((line, idx) => {
          if (line.toLowerCase().includes('lukodda')) {
            console.log(`${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  } catch (e: any) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
}

async function run() {
  const files = [
    'd:\\Manifest System\\backend\\backups\\backup_2026-02-19_22-31-37\\members.json',
    'd:\\Manifest System\\backend\\backups\\backup_2026-02-19_22-31-37\\passengers.json',
    'd:\\Manifest System\\backend\\backups\\backup_2026-02-19_22-31-37\\souls.json',
    'd:\\Manifest System\\backend\\backups\\backup_2026-02-19_22-31-37\\vehicles.json',
    'd:\\Manifest System\\backend\\backups\\members_backup_1770573673385.json',
    'd:\\Manifest System\\backend\\users_dump.json',
    'd:\\Manifest System\\backend\\manifest_pre_phase_3b_2026-02-10T14-15-33-844Z.json',
    'd:\\Manifest System\\backend\\scripts\\s378_identities_recovered.json'
  ];

  for (const f of files) {
    searchFile(f);
  }
}

run().catch(console.error);
