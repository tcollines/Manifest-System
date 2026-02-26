
import { supabase } from '../src/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function checkFirstTimers() {
    console.log('--- Analyzing First Timer Check-ins for Yesterday (Feb 8th, 2026) ---');

    const startDate = '2026-02-08T00:00:00';
    const endDate = '2026-02-08T23:59:59';

    // 1. Fetch Attendance
    const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('member_id, check_in_time')
        .gte('check_in_time', startDate)
        .lte('check_in_time', endDate);

    if (attError) {
        console.error('Error fetching attendance:', attError);
        return;
    }

    if (!attendance || attendance.length === 0) {
        console.log('No check-ins found for Feb 8th.');
        return;
    }

    console.log(`Total Check-ins: ${attendance.length}`);

    // Map member_id -> check_in_time
    const checkInMap = new Map<string, string[]>();
    attendance.forEach(a => {
        if (!checkInMap.has(a.member_id)) checkInMap.set(a.member_id, []);
        checkInMap.get(a.member_id)?.push(a.check_in_time);
    });

    const memberIds = Array.from(checkInMap.keys());

    // 2. Fetch Members
    let members: any[] = [];
    const chunkSize = 200;
    for (let i = 0; i < memberIds.length; i += chunkSize) {
        const chunk = memberIds.slice(i, i + chunkSize);
        const { data: chunkMembers, error } = await supabase
            .from('members')
            .select('id, name, category, joined_date')
            .in('id', chunk);

        if (error) {
            console.error('Error fetching members:', error);
        } else if (chunkMembers) {
            members = members.concat(chunkMembers);
        }
    }

    // 3. Filter First Timers
    const firstTimers = members.filter(m =>
        m.category === 'First Timer' ||
        (m.joined_date && m.joined_date.startsWith('2026-02-08'))
    );

    const outputLines: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        outputLines.push(msg);
    };

    log(`\nFound ${firstTimers.length} First Timers (by Category or Joined Date).`);
    log('\n--- Detailed List ---');
    log('Name | Category | Joined Date | Check-in Time(s)');
    log('------------------------------------------------');

    firstTimers.forEach(m => {
        const times = checkInMap.get(m.id)?.map(t => new Date(t).toLocaleTimeString()).join(', ') || 'N/A';
        log(`${m.name} | ${m.category} | ${m.joined_date} | ${times}`);
    });

    // Count breakdown
    const byCategory = firstTimers.filter(m => m.category === 'First Timer').length;
    const byDate = firstTimers.filter(m => m.joined_date && m.joined_date.startsWith('2026-02-08')).length;

    log('\nSummary:');
    log(`- Total First Timers: ${firstTimers.length}`);
    log(`- By Category 'First Timer': ${byCategory}`);
    log(`- By Joined Date '2026-02-08': ${byDate}`);

    fs.writeFileSync(path.join(__dirname, 'first_timers_report.txt'), outputLines.join('\n'));
    console.log('\nReport saved to first_timers_report.txt');
}

checkFirstTimers().catch(console.error);
