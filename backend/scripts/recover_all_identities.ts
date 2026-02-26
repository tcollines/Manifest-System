
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';
import path from 'path';

export const recoverAll = async () => {
    console.log('--- GLOBAL IDENTITY RECOVERY ---');

    // 1. Load Data
    const backupPath = 'd:/Manifest System/backend/backups/members_backup_1770573673385.json';
    const mappingPath = 'd:/Manifest System/backend/migration_mapping.json';

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

    // Maps
    const backupMap = new Map();
    backup.forEach(m => backupMap.set(m.id, m)); // ID -> Backup Member

    const legacyMap = new Map();
    mapping.forEach(m => legacyMap.set(m.new_id, m.legacy_id)); // New UUID -> Legacy ID

    // 2. Scan Service Attendance for Orphans
    let page = 0;
    const allMembers = new Set();
    while (true) {
        const { data } = await supabase.from('members').select('id').range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        data.forEach(m => allMembers.add(m.id));
        page++;
    }

    let orphans = [];
    page = 0;
    while (true) {
        const { data } = await supabase.from('service_attendance').select('id, member_id, service_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        data.forEach(r => {
            if (!allMembers.has(r.member_id)) {
                orphans.push(r);
            }
        });
        page++;
    }
    console.log(`Total Orphans Found: ${orphans.length}`);

    // 3. Try to Identify
    const recovered = [];
    let identified = 0;

    for (const orphan of orphans) {
        let name = 'UNKNOWN';
        let phone = 'UNKNOWN';
        let source = 'NONE';

        // Path A: Orphan UUID -> Legacy ID -> Backup
        const legId = legacyMap.get(orphan.member_id) || orphan.member_id; // Try direct legacy ID if no map
        const b = backupMap.get(legId);

        if (b) {
            name = b.name;
            phone = b.phone;
            source = 'BACKUP_MAP';
            identified++;
        }

        recovered.push({
            orphan_id: orphan.member_id,
            service_id: orphan.service_id,
            attendance_id: orphan.id,
            name,
            phone,
            source,
            legacy_id: legId
        });
    }

    console.log(`Identified: ${identified} / ${orphans.length}`);

    // 4. Save to JSON
    fs.writeFileSync('d:/Manifest System/backend/scripts/all_identities_recovered.json', JSON.stringify(recovered, null, 2));
    console.log('Saved to scripts/all_identities_recovered.json');
    process.exit(0);
};

recoverAll();
