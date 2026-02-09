
import { supabase } from '../src/supabase';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(__dirname, 'debug_log.txt');
const OUT_FILE = path.join(__dirname, 'all_attendees_feb8.txt');

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function listAllAttendees() {
    fs.writeFileSync(LOG_FILE, ''); // Clear log
    log('--- Generating Full Attendance List for Feb 8th, 2026 ---');

    const startDate = '2026-02-08T00:00:00';
    const endDate = '2026-02-08T23:59:59';

    // 1. Fetch Attendance
    log(`Fetching attendance for ${startDate} to ${endDate}...`);
    const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('member_id, check_in_time')
        .gte('check_in_time', startDate)
        .lte('check_in_time', endDate);

    if (attError) {
        log(`Attendance Fetch Error: ${JSON.stringify(attError)}`);
        return;
    }

    if (!attendance || attendance.length === 0) {
        log('No attendance records found.');
        return;
    }

    log(`Total Attendance Records: ${attendance.length}`);

    const checkInMap = new Map<string, string[]>();
    attendance.forEach(a => {
        if (!checkInMap.has(a.member_id)) checkInMap.set(a.member_id, []);
        checkInMap.get(a.member_id)?.push(a.check_in_time);
    });

    const uniqueIds = Array.from(checkInMap.keys());
    log(`Unique Attendees IDs: ${uniqueIds.length}`);

    // 2. Fetch Details
    let members: any[] = [];
    const chunkSize = 200;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        log(`Fetching chunk ${i} to ${i + chunkSize}...`);
        const chunk = uniqueIds.slice(i, i + chunkSize);
        const { data: chunkMembers, error } = await supabase
            .from('members')
            .select('id, name, category, phone')
            .in('id', chunk);

        if (error) {
            log(`Member Fetch Error: ${JSON.stringify(error)}`);
        } else if (chunkMembers) {
            members.push(...chunkMembers);
        }
    }
    log(`Members Found: ${members.length}`);

    // 3. Generate Report
    const lines = [];
    lines.push(`Attendance Report - Feb 8th, 2026`);
    lines.push(`Total Unique: ${members.length}`);
    lines.push(`--------------------------------------------------------------------------------`);
    lines.push(`Name | Category | Phone | Check-in Time(s)`);
    lines.push(`--------------------------------------------------------------------------------`);

    members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    members.forEach(m => {
        const times = checkInMap.get(m.id)?.map(t => new Date(t).toLocaleTimeString()).join(', ') || 'N/A';
        const name = (m.name || 'Unknown').padEnd(30);
        const cat = (m.category || 'Uncategorized').padEnd(15);
        const phone = (m.phone || '').padEnd(15);
        lines.push(`${name} | ${cat} | ${phone} | ${times}`);
    });

    fs.writeFileSync(OUT_FILE, lines.join('\n'));
    log(`Report saved to ${OUT_FILE}`);
}

listAllAttendees().catch(err => {
    log(`Top Level Error: ${err.message}`);
});
