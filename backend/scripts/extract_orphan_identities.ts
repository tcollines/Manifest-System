import fs from 'fs';
import path from 'path';

async function extractOrphanIdentities() {
    const orphans = [
        '44ae078e-5f12-495c-87d8-3c9e2c0f1a46',
        '0989adcb-4034-477d-3c9e2c0f1a46'
        // I will actually read the whole list of orphans in a script if I could, 
        // but let's test with a few first.
    ];

    const backupPath = 'd:/Manifest System/backend/backups/members_backup_1770573673385.json';
    console.log(`Reading backup: ${backupPath}`);

    const content = fs.readFileSync(backupPath, 'utf8');
    const members = JSON.parse(content);
    console.log(`Loaded ${members.length} members from backup.`);

    const orphanSet = new Set(orphans);
    const found = members.filter((m: any) => orphanSet.has(m.id));

    console.log('Found Identities:');
    found.forEach((m: any) => {
        console.log(`- ID: ${m.id} | Name: ${m.name} | Phone: ${m.phone} | Norm: ${m.name_norm}|${m.phone_last9}|${m.residency_norm}`);
    });
}

extractOrphanIdentities();
