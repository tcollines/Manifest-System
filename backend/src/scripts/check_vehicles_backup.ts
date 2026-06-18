import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = path.join(__dirname, '../../backups/backup_2026-02-19_22-31-37/vehicles.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const matches = data.filter((v: any) => 
      v.coordinator === 'Kiboneka Peter' || 
      v.coordinator === 'Eric Mugerwa' || 
      v.coordinator === 'Mukasa Joseph' ||
      v.coordinator === 'Lukodda Joseph'
    );
    console.log("=== Matching Vehicles in Backup ===");
    console.log(JSON.stringify(matches, null, 2));
  } else {
    console.log("vehicles.json not found.");
  }
}

run().catch(console.error);
