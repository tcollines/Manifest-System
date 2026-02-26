
// @ts-nocheck
import { supabase } from '../src/supabase';

export const audit = async () => {
    // 1. Get all member IDs
    let allIds = new Set();
    let { data: members, error } = await supabase.from('members').select('id');
    if (error) { console.error(members); return; }
    members.forEach(m => allIds.add(m.id));
    console.log(`Members fetched (Set size): ${allIds.size}`);

    // If size is 1000, we missed some. Paginate.
    if (allIds.size >= 1000) {
        let page = 1;
        while (true) {
            const { data, error } = await supabase.from('members').select('id').range(page * 1000, (page + 1) * 1000 - 1);
            if (error || !data || data.length === 0) break;
            data.forEach(m => allIds.add(m.id));
            page++;
        }
    }
    console.log(`Total Unique Members after pagination: ${allIds.size}`);

    // 2. Check a few IDs manually
    const testId = '44ae078e-5f12-495c-811e-cbdf957b05e8';
    console.log(`Is ${testId} in Set? ${allIds.has(testId)}`);

    // 3. Count broken rows in service_attendance
    let totalBroken = 0;
    let totalChecked = 0;
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('service_attendance').select('member_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        totalChecked += data.length;
        data.forEach(r => {
            if (!allIds.has(r.member_id)) {
                totalBroken++;
            }
        });
        page++;
    }
    console.log(`Total Attendance Checked: ${totalChecked}`);
    console.log(`Total Broken Rows: ${totalBroken}`);
    process.exit(0);
};

audit();
