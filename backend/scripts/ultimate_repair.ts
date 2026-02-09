import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function ultimateRepair() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const legacy = 'S378';
    console.log('--- ULTIMATE S378 REPAIR ---');

    // 1. Data Sources
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));

    const backupMap: Record<string, any> = {};
    backup.forEach((m: any) => backupMap[m.id] = m);

    const newToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => newToLegacy[m.new_id] = m.legacy_id);

    // 2. Fetch ALL records for both IDs
    const { data: allAtt } = await supabase.from('service_attendance')
        .select('*')
        .or(`service_id.eq.${uuid},service_id.eq.${legacy}`);

    if (!allAtt) return;
    console.log(`Processing ${allAtt.length} records...`);

    let fixed = 0;
    let deleted = 0;
    let skipped = 0;
    let errors = 0;

    const masterCache: Record<string, string> = {};

    for (const record of allAtt) {
        let legId = newToLegacy[record.member_id] || record.member_id;
        let identity = backupMap[legId];

        if (!identity) {
            // Fuzzy search by ID if it's already in members but not backup?
            // Actually let's just search the DB for the current ID to see identity.
            const { data: current } = await supabase.from('members').select('name_norm, phone_last9, residency_norm').eq('id', record.member_id).single();
            if (current) {
                identity = current;
            }
        }

        if (!identity) {
            skipped++; continue;
        }

        const key = `${identity.name_norm}|${identity.phone_last9}|${identity.residency_norm}`;
        let masterId = masterCache[key];

        if (!masterId) {
            const { data: master } = await supabase.from('members')
                .select('id')
                .eq('name_norm', identity.name_norm)
                .eq('phone_last9', identity.phone_last9)
                .eq('residency_norm', identity.residency_norm)
                .limit(1).single();

            if (master) {
                masterId = master.id;
                masterCache[key] = masterId;
            }
        }

        if (masterId) {
            // Target is UUID and masterId
            if (record.service_id === uuid && record.member_id === masterId) {
                skipped++; continue;
            }

            const { data: collision } = await supabase.from('service_attendance')
                .select('id').eq('service_id', uuid).eq('member_id', masterId).limit(1);

            if (collision && collision.length > 0) {
                await supabase.from('service_attendance').delete().eq('id', record.id);
                deleted++;
            } else {
                const { error } = await supabase.from('service_attendance').update({
                    member_id: masterId,
                    service_id: uuid
                }).eq('id', record.id);
                if (error) errors++; else fixed++;
            }
        } else {
            skipped++;
        }
    }

    console.log(`ULTIMATE COMPLETE: Fixed ${fixed}, Deleted ${deleted}, Skipped ${skipped}, Errors ${errors}`);

    // Final Audit
    const { data: finalAtt } = await supabase.from('service_attendance').select('member_id').eq('service_id', uuid);
    const finalIds = finalAtt?.map(a => a.member_id) || [];
    const { data: finalMems } = await supabase.from('members').select('id').in('id', finalIds);
    console.log(`FINAL RESULT: ${finalMems?.length || 0} healthy members out of ${finalAtt?.length || 0} records.`);
}

ultimateRepair();
