
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugS378() {
    console.log('--- Debugging Service S378 ---');

    // 1. Get Event Details
    const { data: event, error: eventErr } = await supabase
        .from('ministry_events')
        .select('*')
        .eq('legacy_id', 'S378')
        .maybeSingle();

    if (eventErr || !event) {
        console.error('Error finding S378:', eventErr?.message);
        return;
    }

    console.log(`Event S378 ID: ${event.id}`);
    console.log(`Event S378 Date: ${event.date}`);

    // 2. Check Attendance Records
    const { data: attendance, error: attErr, count } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact' })
        .eq('service_id', event.id);

    if (attErr) {
        console.error('Error fetching attendance:', attErr.message);
    } else {
        console.log(`Found ${count} check-ins linked to UUID ${event.id}`);
        if (attendance && attendance.length > 0) {
            console.log('Sample check-in:', JSON.stringify(attendance[0], null, 2));
        }
    }

    // 3. Check for Legacy IDs in Attendance
    const { count: legacyCount } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('legacy_service_id', 'S378');

    console.log(`Found ${legacyCount} check-ins linked to legacy_service_id 'S378'`);

    // 4. Check First Timers
    const { data: firstTimers, count: ftCount } = await supabase
        .from('members')
        .select('id, name, joined_date, category')
        .eq('category', 'First Timer')
        .limit(5);

    console.log(`Total samples of members in 'First Timer' category: ${ftCount}`);
    if (firstTimers) {
        console.log('Sample First Timers:', JSON.stringify(firstTimers, null, 2));
    }

    // 5. Check if memberController.ts logic works for a sample member from attendance
    if (attendance && attendance.length > 0) {
        const memberId = attendance[0].member_id;
        const { data: member } = await supabase.from('members').select('*').eq('id', memberId).single();
        console.log('Verification of member lookup by UUID:', !!member);
    }
}

debugS378();
