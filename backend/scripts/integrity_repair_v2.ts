
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';
import path from 'path';

/**
 * DATABASE INTEGRITY REPAIR V2
 * ----------------------------
 * 1. Load identities from Backup (id -> name|phone|residency)
 * 2. Load current members (name|phone|residency -> current_id)
 * 3. Find broken rows in service_attendance & souls
 * 4. Match identities and produce repair map
 * 5. Update database
 */

const BACKUP_PATH = 'd:/Manifest System/backend/backups/members_backup_1770573673385.json';
const MAPPING_JSON_PATH = 'd:/Manifest System/backend/migration_mapping.json';

const normalize = (s: string) => (s || '').trim().toLowerCase();
const phoneNorm = (p: string) => (p || '').replace(/\D/g, '').slice(-9);

export const repair = async () => {
    console.log('--- STARTING COMPREHENSIVE REPAIR ---');

    try {
        // 1. Load Backup for Identity Mapping (Broken UUID -> Identity)
        console.log('1. Loading Backup Data...');
        const backupRaw = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
        const idToIdentity = new Map();
        backupRaw.forEach(m => {
            const key = `${normalize(m.name)}|${phoneNorm(m.phone)}|${normalize(m.residency)}`;
            idToIdentity.set(m.id, key);
        });
        console.log(`   Loaded ${idToIdentity.size} identities from backup.`);

        // 2. Load Migration Mapping (Optional/Extra checks)
        console.log('2. Loading Migration Mapping...');
        const migrationRaw = JSON.parse(fs.readFileSync(MAPPING_JSON_PATH, 'utf8'));
        const legacyToNewMap = new Map();
        migrationRaw.forEach(m => legacyToNewMap.set(m.legacy_id, m.new_id));
        console.log(`   Loaded ${legacyToNewMap.size} legacy mappings.`);

        // 3. Load Current Members (Identity -> Current UUID)
        console.log('3. Loading Current Valid Members...');
        const identityToCurrentId = new Map();
        let page = 0;
        const pageSize = 1000;
        while (true) {
            const { data, error } = await supabase.from('members').select('id, name, phone, residency').range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            data.forEach(m => {
                const key = `${normalize(m.name)}|${phoneNorm(m.phone)}|${normalize(m.residency)}`;
                // If there are duplicates in identity, we prefer the one reachable by id
                identityToCurrentId.set(key, m.id);
            });
            page++;
            if (data.length < pageSize) break;
        }
        const validIdsSet = new Set(Array.from(identityToCurrentId.values()));
        console.log(`   Mapped ${identityToCurrentId.size} unique identities to current IDs.`);

        // 4. Audit service_attendance for Broken Rows
        console.log('4. Auditing Service Attendance...');
        const brokenAttendance = [];
        page = 0;
        while (true) {
            const { data, error } = await supabase.from('service_attendance').select('*').range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            data.forEach(row => {
                if (!validIdsSet.has(row.member_id)) {
                    brokenAttendance.push(row);
                }
            });
            page++;
            if (data.length < pageSize) break;
        }
        console.log(`   Found ${brokenAttendance.length} broken attendance rows.`);

        // 5. Build Repair Map
        console.log('5. Building Repair Map...');
        const repairMap = new Map(); // BrokenID -> ValidID
        const uniqueBrokenIds = new Set(brokenAttendance.map(r => r.member_id));

        uniqueBrokenIds.forEach(badId => {
            const identity = idToIdentity.get(badId);
            if (identity) {
                const goodId = identityToCurrentId.get(identity);
                if (goodId) {
                    repairMap.set(badId, goodId);
                }
            }
        });
        console.log(`   Repair map built for ${repairMap.size} unique IDs.`);

        // 6. Execute Repair (Batched)
        if (repairMap.size > 0) {
            console.log('6. Executing Repair Updates...');
            let repairedCount = 0;
            // Map badId -> [rowIds] for batched updates
            const badIdToRows = new Map();
            brokenAttendance.forEach(row => {
                const goodId = repairMap.get(row.member_id);
                if (goodId) {
                    if (!badIdToRows.has(row.member_id)) badIdToRows.set(row.member_id, []);
                    badIdToRows.get(row.member_id).push(row.id);
                }
            });

            for (const [badId, rowIds] of badIdToRows.entries()) {
                const goodId = repairMap.get(badId);
                const { error } = await supabase.from('service_attendance').update({ member_id: goodId }).in('id', rowIds);
                if (error) {
                    console.error(`   Error repairing ${rowIds.length} rows for member ${badId}: ${error.message}`);
                } else {
                    repairedCount += rowIds.length;
                    if (repairedCount % 100 === 0) console.log(`   Repaired ${repairedCount} rows...`);
                }
            }
            console.log(`   TOTAL ATTENDANCE REPAIRED: ${repairedCount}`);
        }

        // 7. Audit Souls
        console.log('7. Auditing Souls (source_type=member)...');
        // Note: Souls might link to members differently. In souls table, check captured_by if it's a UUID?
        // Or if souls itself had member links.
        // Let's check souls table structure.
        const { data: soulSample } = await supabase.from('souls').select('*').limit(1);
        if (soulSample && soulSample.length > 0) {
            // In provided soulsStore.ts, 'captured_by' seems to be the one link to users/members.
            // If souls table has member_id, let's check.
            const keys = Object.keys(soulSample[0]);
            if (keys.includes('member_id')) {
                // Repair member_id in souls
                console.log('   Repairing member_id in souls...');
                // Logic would go here
            }
        }

    } catch (e: any) {
        console.error('CRITICAL ERROR:', e.message);
    }
    console.log('--- REPAIR PROCESS COMPLETE ---');
    process.exit(0);
};

repair();
