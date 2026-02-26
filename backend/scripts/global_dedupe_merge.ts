import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function runMerge() {
    console.log('Fetching ALL members (paginated)...');

    let allMembers: any[] = [];
    let lastId = '';
    let hasMore = true;
    const PAGE_SIZE = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from('members')
            .select('id, name_norm, phone_last9, residency_norm, created_at')
            .gt('id', lastId)
            .order('id')
            .limit(PAGE_SIZE);

        if (error) { console.error(error); break; }
        if (!data || data.length === 0) { hasMore = false; break; }

        allMembers = allMembers.concat(data);
        lastId = data[data.length - 1].id;
        console.log(`  Fetched ${allMembers.length} members...`);
    }

    console.log(`Total members loaded: ${allMembers.length}`);

    // Identity Groups
    const groups: Record<string, any[]> = {};
    allMembers.forEach(m => {
        const key = `${m.name_norm}|${m.phone_last9}|${m.residency_norm}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    });

    const duplicateGroups = Object.entries(groups).filter(([key, list]) => list.length > 1);
    console.log(`Groups with Duplicates: ${duplicateGroups.length}`);

    // Fetch ALL attendance in batches
    console.log('Fetching ALL attendance records (paginated)...');
    let allAttendance: any[] = [];
    let aLastMemberId = '';
    let aLastServiceId = '';
    let aHasMore = true;

    // For attendance, composite key is (member_id, service_id). 
    // Simplified: we'll fetch in chunks by member_id or just limit/offset if possible.
    // Using gt(member_id) isn't enough because one member has many attendances.
    // We'll use a simpler approach: get count and loop offset.
    const { count: aCount } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true });
    console.log(`  Total attendance records to check: ${aCount}`);

    for (let i = 0; i < (aCount || 0); i += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('service_attendance')
            .select('member_id, service_id, check_in_time')
            .range(i, i + PAGE_SIZE - 1);

        if (error) { console.error(error); break; }
        if (data) allAttendance = allAttendance.concat(data);
        if (i % 5000 === 0) console.log(`    Loaded ${allAttendance.length} attendance records...`);
    }

    const attendanceMap: Record<string, any[]> = {};
    allAttendance.forEach(a => {
        if (!attendanceMap[a.member_id]) attendanceMap[a.member_id] = [];
        attendanceMap[a.member_id].push(a);
    });

    const dupeIdsToDelete: string[] = [];
    let mergeCount = 0;

    for (const [key, list] of duplicateGroups) {
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const master = list[0];
        const dupes = list.slice(1);

        for (const dupe of dupes) {
            const dupeAttendance = attendanceMap[dupe.id] || [];
            if (dupeAttendance.length > 0) {
                console.log(`  Merging ${dupeAttendance.length} records from ${dupe.id} to ${master.id} (${key})`);
                for (const record of dupeAttendance) {
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
        console.log(`Deleting batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)...`);
        const { error: delErr } = await supabase.from('members').delete().in('id', batch);
        if (delErr) {
            console.error(`  Batch deletion failed: ${delErr.message}`);
        }
    }

    console.log('Final Global deduplication complete.');
}

runMerge();
