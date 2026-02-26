import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function masterRepairV2() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const legacy = 'S378';
    console.log('--- MASTER ATTENDANCE REPAIR V2.0 (S378) ---');

    // 1. Data Sources
    const backupMembers = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));

    const backupByLegacyId: Record<string, any> = {};
    backupMembers.forEach((m: any) => backupByLegacyId[m.id] = m);

    const newToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => newToLegacy[m.new_id] = m.legacy_id);

    // 2. Fetch ALL attendance for S378 (UUID + Legacy)
    const { data: allAtt } = await supabase.from('service_attendance')
        .select('*')
        .or(`service_id.eq.${uuid},service_id.eq.${legacy}`);

    if (!allAtt) {
        console.log('No attendance records found.'); return;
    }
    console.log(`Processing ${allAtt.length} records...`);

    let recovered = 0;
    let deleted = 0;
    let skipped = 0;
    let errors = 0;

    const identityToMasterCache: Record<string, string> = {};

    for (const record of allAtt) {
        const currentMid = record.member_id;

        // A. Resolve Identity for current ID
        let legacyId = newToLegacy[currentMid] || currentMid; // If not in mapping, assume it's legacy or already correct
        let backupInfo = backupByLegacyId[legacyId];

        if (!backupInfo) {
            // Maybe it's already a Master ID? Check database.
            const { data: currentMem } = await supabase.from('members').select('name_norm, phone_last9, residency_norm').eq('id', currentMid).single();
            if (currentMem) {
                backupInfo = currentMem;
            }
        }

        if (!backupInfo) {
            console.warn(`  No identity found for ${currentMid}`);
            skipped++; continue;
        }

        // B. Find Master record for this identity
        const key = `${backupInfo.name_norm}|${backupInfo.phone_last9}|${backupInfo.residency_norm}`;
        let masterId = identityToMasterCache[key];

        if (!masterId) {
            const { data: master } = await supabase.from('members')
                .select('id')
                .eq('name_norm', backupInfo.name_norm)
                .eq('phone_last9', backupInfo.phone_last9)
                .eq('residency_norm', backupInfo.residency_norm)
                .limit(1).single();

            if (master) {
                masterId = master.id;
                identityToMasterCache[key] = masterId;
            }
        }

        if (masterId) {
            // C. Compare with Target
            if (record.service_id === uuid && record.member_id === masterId) {
                // Already correct!
                skipped++; continue;
            }

            // D. Check Collision at Target
            const { data: collision } = await supabase.from('service_attendance')
                .select('id').eq('service_id', uuid).eq('member_id', masterId).limit(1);

            if (collision && collision.length > 0) {
                // COLLISION: If we are not the master record already, delete ourselves
                const { error } = await supabase.from('service_attendance').delete().eq('id', record.id);
                if (error) errors++; else deleted++;
            } else {
                // NO COLLISION: Safe to update
                const { error } = await supabase.from('service_attendance')
                    .update({ member_id: masterId, service_id: uuid })
                    .eq('id', record.id);
                if (error) {
                    console.error(`  Update failed for record ${record.id}:`, error.message);
                    errors++;
                } else {
                    recovered++;
                }
            }
        } else {
            console.warn(`  Master NOT FOUND in DB for ${backupInfo.name_norm || currentMid}`);
            skipped++;
        }
    }

    console.log(`REPAIR FINISHED.`);
    console.log(`  Records Corrected: ${recovered}`);
    console.log(`  Duplicates Deleted: ${deleted}`);
    console.log(`  Already Correct/Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
}

masterRepairV2();
