import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function finalRemediation() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    console.log('--- FINAL S378 REMEDIATION ---');

    // 1. Data Sources
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));

    // Map IDs to identities in backup
    const backupMap: Record<string, any> = {};
    backup.forEach((m: any) => backupMap[m.id] = m);

    // Map New IDs to Legacy IDs
    const newToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => newToLegacy[m.new_id] = m.legacy_id);

    // Get all S378 attendance
    const { data: allAtt } = await supabase.from('service_attendance').select('*').eq('service_id', serviceId);
    if (!allAtt) return;

    console.log(`Processing ${allAtt.length} total records for S378...`);

    let fixed = 0;
    let deleted = 0;
    let skipped = 0;
    let errors = 0;

    const masterCache: Record<string, string> = {};

    for (const record of allAtt) {
        // A. Find Identity
        let legId = newToLegacy[record.member_id] || record.member_id;
        let identity = backupMap[legId];

        if (!identity) {
            // Search DB for whoever this ID was? 
            // Since it's an orphan, we CAN'T. 
            // So we'll skip for now if not in backup.
            skipped++; continue;
        }

        // B. Find Surviving Master
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
            if (record.member_id === masterId) {
                skipped++; continue;
            }

            // check collision
            const { data: collision } = await supabase.from('service_attendance')
                .select('id').eq('service_id', serviceId).eq('member_id', masterId).limit(1);

            if (collision && collision.length > 0) {
                await supabase.from('service_attendance').delete().eq('id', record.id);
                deleted++;
            } else {
                const { error } = await supabase.from('service_attendance').update({ member_id: masterId }).eq('id', record.id);
                if (error) errors++; else fixed++;
            }
        } else {
            skipped++;
        }
    }

    console.log(`REMEDIATION COMPLETE: Fixed ${fixed}, Deleted Duplicates ${deleted}, Skipped ${skipped}, Errors ${errors}`);

    // Audit again
    const { data: finalAtt } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    const finalIds = finalAtt?.map(a => a.member_id) || [];
    const { data: finalMems } = await supabase.from('members').select('id').in('id', finalIds);
    console.log(`Final Audit: ${finalMems?.length || 0} healthy members out of ${finalAtt?.length || 0} records.`);
}

finalRemediation();
