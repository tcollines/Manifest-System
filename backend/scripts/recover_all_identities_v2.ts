
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';
import path from 'path';

export const recoverAll = async () => {
    console.log('--- GLOBAL IDENTITY RECOVERY (DEBUG) ---');

    console.log('1. Loading Data...');
    const backupPath = 'd:/Manifest System/backend/backups/members_backup_1770573673385.json';
    const mappingPath = 'd:/Manifest System/backend/migration_mapping.json';

    if (!fs.existsSync(backupPath)) { console.error('Backup not found'); return; }
    if (!fs.existsSync(mappingPath)) { console.error('Mapping not found'); return; }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`Backup Size: ${backup.length}, Mapping Size: ${mapping.length}`);

    // Maps
    const backupMap = new Map();
    backup.forEach(m => backupMap.set(m.id, m));

    const legacyMap = new Map();
    mapping.forEach(m => legacyMap.set(m.new_id, m.legacy_id));

    // 2. Load Members
    let page = 0;
    const allMembers = new Set();
    while (true) {
        const { data, error } = await supabase.from('members').select('id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error) { console.error('Members Error:', error); break; }
        if (!data || data.length === 0) break;
        data.forEach(m => allMembers.add(m.id));
        page++;
    }
    console.log(`Members Loaded: ${allMembers.size}`);

    // 3. Scan Attendance
    let orphans = [];
    page = 0;
    let totalAtt = 0;
    let debugCount = 0;

    // Debug: Check a known orphan ID exists in attendance but not in allMembers
    const knownBad = 'd3fe5924-f8d4-4c66-bf9e-14057a5941d6';
    if (allMembers.has(knownBad)) console.log(`CRITICAL: Known Bad ID ${knownBad} IS IN ALLMEMBERS SET!`);
    else console.log(`Confirmed: Known Bad ID ${knownBad} is NOT in allMembers set.`);

    // Debug: Check if Known Bad ID exists in attendance table at all
    const { data: badCheck } = await supabase.from('service_attendance').select('*').eq('member_id', knownBad);
    console.log(`Direct Check for Bad ID ${knownBad}: Found ${badCheck?.length} records.`);

    while (true) {
        const { data, error } = await supabase.from('service_attendance').select('id, member_id, service_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error) { console.error('Attendance Error:', error); break; }
        if (!data || data.length === 0) break;

        totalAtt += data.length;
        data.forEach(r => {
            if (!allMembers.has(r.member_id)) {
                orphans.push(r);
                if (debugCount < 5) {
                    console.log(`Debug Orphan Found: ${r.member_id} (Service: ${r.service_id})`);
                    debugCount++;
                }
            } else {
                // It's a valid member
                if (r.member_id === knownBad) console.log('WTF? Found known bad ID but it passed the set check?');
            }
        });
        page++;
    }
    console.log(`Total Attendance Scanned: ${totalAtt}`);
    console.log(`Total Orphans Found: ${orphans.length}`);

    // 3. Try to Identify
    const recovered = [];
    let identified = 0;
    let matchesFound = 0;

    for (const orphan of orphans) {
        let name = 'UNKNOWN';
        let phone = 'UNKNOWN';
        let source = 'NONE';
        let survivorId = null;

        // Path A: Orphan UUID -> Legacy ID -> Backup
        const legId = legacyMap.get(orphan.member_id) || orphan.member_id;
        const b = backupMap.get(legId);

        if (b) {
            name = b.name;
            phone = b.phone;
            source = 'BACKUP_MAP';
            identified++;

            // Check if survivor exists in DB?
            // This is async, so we can't do it in this loop easily without batching?
            // Just saving identity identifying info for now.
        }

        recovered.push({
            orphan_id: orphan.member_id,
            service_id: orphan.service_id,
            attendance_id: orphan.id,
            name,
            phone,
            residency: b?.residency || 'UNKNOWN',
            source,
            legacy_id: legId
        });
    }

    console.log(`Identified: ${identified} / ${orphans.length}`);

    // 4. Save to JSON
    fs.writeFileSync('d:/Manifest System/backend/scripts/all_identities_recovered_v2.json', JSON.stringify(recovered, null, 2));
    console.log('Saved to scripts/all_identities_recovered_v2.json');
    process.exit(0);
};

recoverAll();
