
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- CHECKING JAN 24 DATA GAP ---');

    // 1. Get Event
    const { data: events } = await supabase
        .from('ministry_events')
        .select('*')
        .eq('date', '2026-01-24');

    if (!events || events.length === 0) { console.log('Event not found'); return; }
    const event = events[0];

    console.log(`Event: ${event.id} (${event.title})`);
    console.log(`Stat 'firstTimers': ${event.stats?.firstTimers}`);
    console.log(`Stat 'attendees': ${event.stats?.attendees}`);

    // 2. Count actual rows
    const { count: attCount } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', event.id);

    console.log(`Actual Service Attendance Rows: ${attCount}`);

    // 3. Count Members linked
    const { count: memCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('first_timer_service_id', event.id);

    console.log(`Actual Linked First Timers (Members): ${memCount}`);
}

check();
