
// @ts-nocheck
import { supabase } from '../src/supabase';

export const analyze = async () => {
    console.log('--- Analyzing Check-ins for 8th Feb 2026 ---');

    // Define the date range for the entire day of Feb 8th (UTC or Local? Assuming DB stores UTC or compatible)
    // Adjusting for potential timezone issues, best to check a wide range or just string match if simple
    const startDate = '2026-02-08T00:00:00';
    const endDate = '2026-02-08T23:59:59';

    try {
        // 1. Fetch Attendance by Date Range
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('member_id, check_in_time, service_id')
            .gte('check_in_time', startDate)
            .lte('check_in_time', endDate);

        if (attError) throw attError;

        if (!attendance || attendance.length === 0) {
            console.log('No check-ins found for this date.');
            return;
        }

        console.log(`Total Check-in Records Found: ${attendance.length}`);

        const memberIds = attendance.map(a => a.member_id);
        const uniqueMemberIds = [...new Set(memberIds)];
        console.log(`Unique Member IDs: ${uniqueMemberIds.length}`);

        // 2. Fetch Member Details (Chunked)
        let members: any[] = [];
        const chunkSize = 200;
        for (let i = 0; i < uniqueMemberIds.length; i += chunkSize) {
            const chunk = uniqueMemberIds.slice(i, i + chunkSize);
            const { data: chunkMembers, error } = await supabase
                .from('members')
                .select('id, name, category, joined_date')
                .in('id', chunk);

            if (error) console.error('Member Fetch Error:', error);
            if (chunkMembers) members = members.concat(chunkMembers);
        }

        console.log(`Resolved Member Details: ${members.length}`);

        // 3. Stats
        let firstTimersByCategory = 0;
        let firstTimersByDate = 0;
        let membersCount = 0;

        members.forEach(m => {
            if (m.category === 'First Timer') {
                firstTimersByCategory++;
            } else {
                membersCount++;
            }

            // Also check joined_date strictly
            if (m.joined_date && m.joined_date.startsWith('2026-02-08')) {
                firstTimersByDate++;
            }
        });

        console.log(`UNIQUE:${members.length}`);
        console.log(`MEMBERS:${membersCount}`);
        console.log(`FIRST_TIMERS:${firstTimersByCategory}`);
        console.log(`NEW_JOINS:${firstTimersByDate}`);


    } catch (err: any) {
        console.error('Error:', err.message);
    }
    process.exit(0);
};

analyze();
