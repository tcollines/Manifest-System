
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectEvent() {
    console.log('--- INSPECTING EVENT ON 2026-01-24 ---');

    // 1. Get Event Details
    const { data: events } = await supabase
        .from('ministry_events')
        .select('*')
        .eq('date', '2026-01-24');

    if (!events || events.length === 0) { console.log('No event found on this date.'); return; }

    const event = events[0];
    console.log('Event:', event.title, event.id);
    console.log('Stats:', JSON.stringify(event.stats, null, 2));

    // 2. Check Service Attendance
    // See if there are nameless checks-ins or raw attendance records
    const { count: attendanceCount } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', event.id);

    console.log(`Service Attendance Rows: ${attendanceCount}`);

    // 3. Check Members Linked
    const { count: memberCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('first_timer_service_id', event.id);

    console.log(`Members with this as First Timer Service ID: ${memberCount}`);

    // 4. Check if there are members joined on this date but not linked
    const { count: dateMatchCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('joined_date', '2026-01-24');

    console.log(`Members joined exactly on 2026-01-24: ${dateMatchCount}`);
}

inspectEvent();
