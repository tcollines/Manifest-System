
import { supabase } from '../src/supabase';

async function analyzeBreakdown() {
    console.log('--- Attendance Breakdown for Feb 8th, 2026 ---');

    const startDate = '2026-02-08T00:00:00';
    const endDate = '2026-02-08T23:59:59';

    // 1. Fetch Attendance
    const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('member_id')
        .gte('check_in_time', startDate)
        .lte('check_in_time', endDate);

    if (attError) { console.error(attError); return; }

    const uniqueIds = [...new Set(attendance?.map(a => a.member_id) || [])];
    console.log(`Total Check-ins: ${attendance?.length || 0}`);
    console.log(`Unique Attendees: ${uniqueIds.length}`);

    if (uniqueIds.length === 0) return;

    // 2. Fetch Categories
    const categoryCounts: Record<string, number> = {};
    const chunkSize = 200;

    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        const chunk = uniqueIds.slice(i, i + chunkSize);
        const { data: members, error } = await supabase
            .from('members')
            .select('category')
            .in('id', chunk);

        if (members) {
            members.forEach(m => {
                const cat = m.category || 'Uncategorized';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
        }
    }

    console.log('\nBreakdown by Category:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
        console.log(`- ${cat}: ${count}`);
    });
}

analyzeBreakdown().catch(console.error);
