import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function analyze() {
    console.log('Fetching all members to group identity...');
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

    const duplicates = Object.entries(groups).filter(([key, list]) => list.length > 1);
    console.log(`Groups with Duplicates: ${duplicates.length}`);

    let totalDupeAttendance = 0;
    let groupsWithAttendanceOnDupes = 0;

    for (const [key, list] of duplicates) {
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const master = list[0];
        const dupes = list.slice(1);

        let foundAttendance = false;
        for (const dupe of dupes) {
            const { count } = await supabase
                .from('service_attendance')
                .select('*', { count: 'exact', head: true })
                .eq('member_id', dupe.id);

            if (count && count > 0) {
                totalDupeAttendance += count;
                foundAttendance = true;
            }
        }
        if (foundAttendance) groupsWithAttendanceOnDupes++;
    }

    console.log(`Total Attendance records on DUPLICATE members: ${totalDupeAttendance}`);
    console.log(`Groups where a duplicate has attendance: ${groupsWithAttendanceOnDupes}`);
}

analyze();
