import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function robustRepair() {
    console.log('Starting Robust Global Attendance Array Repair...');

    // 1. Fetch Source of Truth: Table
    console.log('  Loading all attendance from table...');
    const { data: allAttendance } = await supabase.from('service_attendance').select('member_id, service_id');
    const attendanceMap: Record<string, Set<string>> = {};
    allAttendance?.forEach(a => {
        if (!attendanceMap[a.member_id]) attendanceMap[a.member_id] = new Set();
        attendanceMap[a.member_id].add(a.service_id);
    });

    // 2. Paginated Scan and Fix
    let totalFixed = 0;
    let lastId = '';
    let hasMore = true;
    const PAGE_SIZE = 500;

    while (hasMore) {
        const { data, error } = await supabase
            .from('members')
            .select('id, name, attended_service_ids')
            .gt('id', lastId)
            .order('id')
            .limit(PAGE_SIZE);

        if (error) { console.error('Fetch error:', error); break; }
        if (!data || data.length === 0) { hasMore = false; break; }

        for (const m of data) {
            const tableSet = attendanceMap[m.id] || new Set();
            const array = m.attended_service_ids || [];
            const arraySet = new Set(array);

            let isMismatch = arraySet.size !== tableSet.size;
            if (!isMismatch) {
                for (const s of tableSet) {
                    if (!arraySet.has(s)) { isMismatch = true; break; }
                }
            }

            if (isMismatch) {
                const correctArray = Array.from(tableSet);
                const { error: updErr } = await supabase
                    .from('members')
                    .update({ attended_service_ids: correctArray })
                    .eq('id', m.id);

                if (updErr) {
                    console.error(`    Error updating ${m.id}: ${updErr.message}`);
                } else {
                    totalFixed++;
                }
            }
        }

        lastId = data[data.length - 1].id;
        console.log(`  Processed through ${lastId}. Total repairs so far: ${totalFixed}`);
    }

    console.log(`Robust repair complete. Total records standardized: ${totalFixed}`);
}

robustRepair();
