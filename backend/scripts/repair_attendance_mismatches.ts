import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function repairMismatches() {
    console.log('Repairing attendance mismatches...');

    // 1. Fetch all attendance
    const { data: allAttendance } = await supabase.from('service_attendance').select('member_id, service_id');
    const attendanceMap: Record<string, Set<string>> = {};
    allAttendance?.forEach(a => {
        if (!attendanceMap[a.member_id]) attendanceMap[a.member_id] = new Set();
        attendanceMap[a.member_id].add(a.service_id);
    });

    // 2. Identify and repair
    let allMembers: any[] = [];
    let lastId = '';
    let hasMore = true;
    while (hasMore) {
        const { data } = await supabase.from('members').select('id, name, attended_service_ids').gt('id', lastId).order('id').limit(1000);
        if (!data || data.length === 0) { hasMore = false; break; }
        allMembers = allMembers.concat(data);
        lastId = data[data.length - 1].id;
    }

    let repairCount = 0;
    for (const m of allMembers) {
        const array = m.attended_service_ids || [];
        const tableSet = attendanceMap[m.id] || new Set();
        const arraySet = new Set(array);

        let isMismatch = arraySet.size !== tableSet.size;
        if (!isMismatch) {
            for (const s of tableSet) {
                if (!arraySet.has(s)) { isMismatch = true; break; }
            }
        }

        if (isMismatch) {
            const correctArray = Array.from(tableSet);
            const { error } = await supabase
                .from('members')
                .update({ attended_service_ids: correctArray })
                .eq('id', m.id);

            if (error) {
                console.error(`Failed to repair ${m.name}: ${error.message}`);
            } else {
                repairCount++;
                if (repairCount % 50 === 0) console.log(`  Repaired ${repairCount} members...`);
            }
        }
    }

    console.log(`Global repair complete. Total members synchronized: ${repairCount}`);
}

repairMismatches();
