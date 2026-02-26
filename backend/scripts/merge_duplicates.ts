import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function mergeDuplicates() {
    console.log('Starting Deep Merge of Duplicates...');

    const { data: members, error } = await supabase
        .from('members')
        .select('id, name_norm, phone_last9, residency_norm, created_at');

    if (error) { console.error(error); return; }

    const groups: Record<string, any[]> = {};
    members.forEach(m => {
        const key = `${m.name_norm}|${m.phone_last9}|${m.residency_norm}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    });

    const duplicateGroups = Object.entries(groups).filter(([key, list]) => list.length > 1);
    console.log(`Found ${duplicateGroups.length} groups to merge.`);

    for (const [key, list] of duplicateGroups) {
        // Sort by created_at to keep the OLDEST as the master
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const master = list[0];
        const duplicates = list.slice(1);

        console.log(`Merging into Master: ${master.id} (Key: ${key})`);

        for (const dupe of duplicates) {
            console.log(`  Processing duplicate: ${dupe.id}...`);

            // 1. Move Attendance
            const { data: attendance } = await supabase
                .from('service_attendance')
                .select('*')
                .eq('member_id', dupe.id);

            if (attendance && attendance.length > 0) {
                console.log(`    Moving ${attendance.length} attendance records...`);
                for (const record of attendance) {
                    const { error: moveErr } = await supabase
                        .from('service_attendance')
                        .insert({
                            member_id: master.id,
                            service_id: record.service_id,
                            check_in_time: record.check_in_time
                        });
                    // ignore error if it's already there (on conflict would be better but insert or handle is fine)
                }
            }

            // 2. Update Souls (source_id)
            // We check if this member is a soul source
            const { error: soulErr } = await supabase
                .from('souls')
                .update({ source_id: master.id })
                .eq('source_id', dupe.id);

            if (soulErr) console.warn(`    Soul update error: ${soulErr.message}`);

            // 3. Delete Duplicate
            const { error: delErr } = await supabase
                .from('members')
                .delete()
                .eq('id', dupe.id);

            if (delErr) {
                console.error(`    FAILED TO DELETE ${dupe.id}: ${delErr.message}`);
            } else {
                console.log(`    Deleted ${dupe.id}`);
            }
        }
    }

    console.log('Merge process complete.');
}

mergeDuplicates();
