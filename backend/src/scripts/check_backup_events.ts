import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = path.join(__dirname, '../../backups/backup_2026-02-19_22-31-37/ministry_events.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log("=== Events in backups/backup_2026-02-19_22-31-37/ministry_events.json ===");
    data.forEach((e: any) => {
      console.log(`- Title: ${e.title} | Date: ${e.date} | ID: ${e.id}`);
    });

    console.log("\nSearching for event ID '6ef635f1-d285-4188-baca-612c8a19e4db' in backup events...");
    const match = data.find((e: any) => e.id === '6ef635f1-d285-4188-baca-612c8a19e4db');
    if (match) {
      console.log("FOUND EVENT MATCH:", JSON.stringify(match, null, 2));
    } else {
      console.log("Not found in events list. Checking other keys...");
    }
  } else {
    console.log("ministry_events.json not found.");
  }
}

run().catch(console.error);
