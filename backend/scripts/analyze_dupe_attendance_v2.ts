import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function analyzeDupeAttendance() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const legacy = 'S378';

    // Get all attendance for both
    const { data: allAtt } = await supabase.from('service_attendance')
        .select('id, member_id, service_id')
        .or(`service_id.eq.${uuid},service_id.eq.${legacy}`);

    if (!allAtt) {
        console.log('No attendance found'); return;
    }

    console.log(`Total records for S378 (UUID + Legacy): ${allAtt.length}`);

    // Group by member_id
    const byMember: Record<string, any[]> = {};
    allAtt.forEach(a => {
        if (!byMember[a.member_id]) byMember[a.member_id] = [];
        byMember[a.member_id].push(a);
    });

    const dupes = Object.entries(byMember).filter(([mid, records]) => records.length > 1);
    console.log(`Members with duplicate attendance records for S378: ${dupes.length}`);

    // Check how many members exist in database
    const attendeeIds = Object.keys(byMember);
    const { data: members } = await supabase.from('members').select('id, name, category').in('id', attendeeIds);
    const memberSet = new Set(members?.map(m => m.id));

    console.log(`Unique Member IDs in attendance: ${attendeeIds.length}`);
    console.log(`  Existing in members table: ${members?.length || 0}`);
    console.log(`  Orphans: ${attendeeIds.length - (members?.length || 0)}`);

    const firstTimers = members?.filter(m => m.category === 'First Timer').length || 0;
    console.log(`Registered First Timers in attendance: ${firstTimers}`);
}

analyzeDupeAttendance();
