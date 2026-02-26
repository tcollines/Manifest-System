import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function finalRepair() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378
    console.log('--- FINAL ROBUST ATTENDANCE REPAIR ---');

    // 1. Data Sources
    const backupMembers = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));

    const backupByLegacyId: Record<string, any> = {};
    backupMembers.forEach((m: any) => backupByLegacyId[m.id] = m);

    const newToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => newToLegacy[m.new_id] = m.legacy_id);

    // 2. Fetch Orphans
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    const ids = Array.from(new Set(att?.map(a => a.member_id)));
    const { data: mems } = await supabase.from('members').select('id').in('id', ids);
    const memSet = new Set(mems?.map(m => m.id));
    const orphans = ids.filter(id => !memSet.has(id));

    console.log(`Repairing ${orphans.length} orphans...`);

    let recovered = 0;
    let skipped = 0;
    let deleted = 0;
    let errors = 0;

    const identityToMasterCache: Record<string, string> = {};

    for (const orphanId of orphans) {
        const legacyId = newToLegacy[orphanId];
        if (!legacyId) {
            console.warn(`  Orphan ${orphanId} not in mapping!`);
            skipped++; continue;
        }

        const backupInfo = backupByLegacyId[legacyId];
        if (!backupInfo) {
            console.warn(`  Legacy ${legacyId} not in backup!`);
            skipped++; continue;
        }

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
            // Check collision
            const { data: collision } = await supabase.from('service_attendance')
                .select('*').eq('service_id', serviceId).eq('member_id', masterId).limit(1);

            if (collision && collision.length > 0) {
                const { error } = await supabase.from('service_attendance').delete().eq('service_id', serviceId).eq('member_id', orphanId);
                if (error) errors++; else deleted++;
            } else {
                const { error } = await supabase.from('service_attendance').update({ member_id: masterId }).eq('service_id', serviceId).eq('member_id', orphanId);
                if (error) errors++; else recovered++;
            }
        } else {
            console.warn(`  Master NOT FOUND for ${backupInfo.name}`);
            skipped++;
        }

        if ((recovered + deleted + skipped) % 100 === 0) {
            console.log(`  Progress: ${recovered} recovered, ${deleted} deleted, ${skipped} skipped...`);
        }
    }

    console.log(`REPAIR FINISHED.`);
    console.log(`  Recovered: ${recovered}`);
    console.log(`  Deleted (collisions): ${deleted}`);
    console.log(`  Skipped (No Master/Backup): ${skipped}`);
    console.log(`  Errors: ${errors}`);
}

finalRepair();
