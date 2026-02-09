import fs from 'fs';

async function searchBackupForOrphans() {
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const backupIds = new Set(backup.map((m: any) => m.id));

    // Get orphans from temporary file or memory (I should have saved them)
    // Actually I'll just re-fetch them in a script that also reads the backup
    const { createClient } = require('@supabase/supabase-js');
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', uuid);
    const ids = Array.from(new Set(att?.map((a: any) => a.member_id) || []));

    // Check in members table first to define orphans
    const { data: mems } = await supabase.from('members').select('id').in('id', ids);
    const memSet = new Set(mems?.map((m: any) => m.id));
    const orphans = ids.filter(id => !memSet.has(id));

    console.log(`Orphans to check: ${orphans.length}`);

    let foundInBackup = 0;
    let output = '# Orphan Backup Data\n\n';

    orphans.forEach(oid => {
        const b = backup.find((m: any) => m.id === oid);
        if (b) {
            foundInBackup++;
            output += `- ID: ${b.id}\n`;
            output += `  - Name: ${b.name}\n`;
            output += `  - Phone: ${b.phone}\n`;
            output += `  - Residence: ${b.residency}\n\n`;
        }
    });

    console.log(`Found ${foundInBackup} / ${orphans.length} matches in backup.`);
    fs.writeFileSync('d:/Manifest System/backend/scripts/orphan_backup_matches.md', output);
}

searchBackupForOrphans();
