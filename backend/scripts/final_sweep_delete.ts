
import { supabase } from '../src/supabase';

async function finalSweep() {
    console.log('Starting Final Sweep of broken service_attendance records...');

    // 1. Fetch valid members
    console.log('Fetching valid members...');
    const validMemberIds = new Set<string>();
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('members').select('id').range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        data.forEach(m => validMemberIds.add(m.id));
        page++;
    }
    console.log(`Valid Members: ${validMemberIds.size}`);

    // 2. Fetch all attendance
    console.log('Fetching attendance...');
    let allAttendance = [];
    page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('service_attendance')
            .select('id, member_id')
            .range(page * 1000, (page + 1) * 1000 - 1); // 1000 batch

        if (!data || data.length === 0) break;
        allAttendance.push(...data);
        page++;
        // Safety break
        if (page > 5000) break;
    }
    console.log(`Total Attendance Records: ${allAttendance.length}`);

    // 3. Identify Broken
    const brokenIds = allAttendance
        .filter(a => !validMemberIds.has(a.member_id))
        .map(a => a.id);

    console.log(`Remaining Broken Rows: ${brokenIds.length}`);

    if (brokenIds.length === 0) {
        console.log('Clean. No action needed.');
        return;
    }

    // 4. Delete
    console.log(`Deleting ${brokenIds.length} surviving ghost records...`);
    const batchSize = 100;
    for (let i = 0; i < brokenIds.length; i += batchSize) {
        const batch = brokenIds.slice(i, i + batchSize);
        const { error } = await supabase
            .from('service_attendance')
            .delete()
            .in('id', batch);

        if (error) {
            console.error('Delete failed:', error);
        } else {
            process.stdout.write('x');
        }
    }
    console.log('\nFinal Sweep Complete.');
}

finalSweep().catch(console.error);
