import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function repairS378() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378
    console.log(`Starting Repair for S378...`);

    const backupPath = 'd:/Manifest System/backend/backups/members_backup_1770573673385.json';
    if (!fs.existsSync(backupPath)) {
        console.error('Backup file not found:', backupPath);
        return;
    }
    const backupMembers = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const backupMap: Record<string, any> = {};
    backupMembers.forEach((m: any) => {
        backupMap[m.id] = m;
    });

    const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('member_id')
        .eq('service_id', serviceId);

    if (attError) { console.error('Attendance fetch error:', attError); return; }
    const allIds = Array.from(new Set(attendance.map(a => a.member_id)));

    // Identify orphans in batches
    let existingSet = new Set<string>();
    const BATCH_SIZE = 500;
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batch = allIds.slice(i, i + BATCH_SIZE);
        const { data } = await supabase.from('members').select('id').in('id', batch);
        data?.forEach(m => existingSet.add(m.id));
    }

    const orphanedIds = allIds.filter(id => !existingSet.has(id));
    console.log(`Found ${orphanedIds.length} orphaned distinct IDs.`);

    let totalUpdated = 0;
    let totalDeleted = 0;
    let errors = 0;

    for (const oldId of orphanedIds) {
        const backupInfo = backupMap[oldId];
        if (!backupInfo) {
            console.warn(`  No backup for ${oldId}`);
            continue;
        }

        const { data: master } = await supabase
            .from('members')
            .select('id')
            .eq('name_norm', backupInfo.name_norm)
            .eq('phone_last9', backupInfo.phone_last9)
            .eq('residency_norm', backupInfo.residency_norm)
            .limit(1)
            .single();

        if (master) {
            // Check if master already has attendance for this service
            const { data: exists } = await supabase
                .from('service_attendance')
                .select('*')
                .eq('service_id', serviceId)
                .eq('member_id', master.id)
                .limit(1);

            if (exists && exists.length > 0) {
                // Duplicate attendance, just delete the orphan
                const { error } = await supabase
                    .from('service_attendance')
                    .delete()
                    .eq('service_id', serviceId)
                    .eq('member_id', oldId);
                if (error) { console.error('  Delete error:', error); errors++; }
                else totalDeleted++;
            } else {
                // Map orphan to master
                const { error } = await supabase
                    .from('service_attendance')
                    .update({ member_id: master.id })
                    .eq('service_id', serviceId)
                    .eq('member_id', oldId);
                if (error) { console.error('  Update error:', error); errors++; }
                else totalUpdated++;
            }
        } else {
            console.warn(`  No master found for ${backupInfo.name}`);
        }

        if ((totalUpdated + totalDeleted) % 50 === 0) {
            console.log(`  Progress: ${totalUpdated} updated, ${totalDeleted} deleted...`);
        }
    }

    console.log(`Repair Finished.`);
    console.log(`Updated: ${totalUpdated}`);
    console.log(`Deleted: ${totalDeleted}`);
    console.log(`Errors: ${errors}`);
}

repairS378();
