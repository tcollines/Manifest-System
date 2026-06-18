import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const backupDir = path.join(__dirname, '../../backups/backup_2026-02-19_22-31-37');
  if (!fs.existsSync(backupDir)) {
    console.log("Backup dir not found.");
    return;
  }

  const files = fs.readdirSync(backupDir);
  for (const file of files) {
    const filePath = path.join(backupDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('s-1769946877871') || content.includes('s-1770145860115')) {
      console.log(`=== Matches in ${file} ===`);
      const data = JSON.parse(content);
      const matches = data.filter((x: any) => 
        JSON.stringify(x).includes('s-1769946877871') || 
        JSON.stringify(x).includes('s-1770145860115')
      );
      console.log(JSON.stringify(matches, null, 2));
    }
  }
}

run().catch(console.error);
