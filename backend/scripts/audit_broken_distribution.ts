
// @ts-nocheck
import { supabase } from '../src/supabase';

export const auditDist = async () => {
    // 1. Get all members
    let memberSet = new Set();
    let page = 0;
    while (true) {
        const { data } = await supabase.from('members').select('id').range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        data.forEach(m => memberSet.add(m.id));
        page++;
    }
    console.log(`Members Loaded: ${memberSet.size}`);

    // 2. Get all attendance and check orphans
    const { data: attendance } = await supabase.from('service_attendance').select('service_id, member_id');
    const broken = attendance.filter(a => !memberSet.has(a.member_id));

    const dist = {};
    broken.forEach(b => {
        dist[b.service_id] = (dist[b.service_id] || 0) + 1;
    });

    // Sort and Log
    const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    console.log('--- BROKEN ROWS BY SERVICE ---');
    sorted.forEach(([sid, count]) => {
        console.log(`${sid}: ${count}`);
    });
    process.exit(0);
};

auditDist();
