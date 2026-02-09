import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function runMerge() {
    console.log('Fetching all members...');
    const { data: members, error: mErr } = await supabase
        .from('members')
        .select('id, name_norm, phone_last9, residency_norm, created_at');

    if (mErr) { console.error(mErr); return; }

    // Identity Groups
    const groups: Record<string, any[]> = {};
    members.forEach(m => {
        const key = `${m.name_norm}|${m.phone_last9}|${m.residency_norm}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    });

    const duplicates = Object.entries(groups).filter(([key, list]) => list.length > 1);
    console.log(`Groups with Duplicates: ${duplicates.length}`);

    // Fetch ALL attendance in batches if needed, but for 13k total members it should be manageable
    console.log('Fetching all attendance records...');
    const { data: allAttendance, error: aErr } = await supabase
        .from('service_attendance')
        .select('member_id, service_id, check_in_time');

    if (aErr) { console.error(aErr); return; }

    const attendanceMap: Record<string, any[]> = {};
    allAttendance.forEach(a => {
        if (!attendanceMap[a.member_id]) attendanceMap[a.member_id] = [];
        attendanceMap[a.member_id].push(a);
    });

    const dupeIdsToDelete: string[] = [];
    let mergeCount = 0;

    for (const [key, list] of duplicates) {
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const master = list[0];
        const dupes = list.slice(1);

        for (const dupe of dupes) {
            const dupeAttendance = attendanceMap[dupe.id] || [];
            if (dupeAttendance.length > 0) {
                console.log(`  Merging ${dupeAttendance.length} records from ${dupe.id} to ${master.id}`);
                for (const record of dupeAttendance) {
                    // Move to master (insert ignore-style)
                    // Standard client doesn't do ON CONFLICT easily without specialized RPC or trial/error
                    // But we can try to find existing master attendance
                    const { error: insErr } = await supabase.from('service_attendance').upsert({
                        member_id: master.id,
                        service_id: record.service_id,
                        check_in_time: record.check_in_time
                    }, { onConflict: 'member_id,service_id' });

                    if (insErr) console.warn(`    Merge error for ${dupe.id}: ${insErr.message}`);
                    else mergeCount++;
                }
            }
            dupeIdsToDelete.push(dupe.id);
        }
    }

    console.log(`Total duplicated records to delete: ${dupeIdsToDelete.length}`);
    console.log(`Total attendance records merged: ${mergeCount}`);

    // Bulk Delete
    const BATCH_SIZE = 50;
    for (let i = 0; i < dupeIdsToDelete.length; i += BATCH_SIZE) {
        const batch = dupeIdsToDelete.slice(i, i + BATCH_SIZE);
        console.log(`Deleting batch ${i / BATCH_SIZE + 1} (${batch.length} records)...`);
        const { error: delErr } = await supabase.from('members').delete().in('id', batch);
        if (delErr) {
            console.error(`  Batch deletion failed: ${delErr.message}`);
        }
    }

    console.log('Final deduplication complete.');
}

runMerge();
