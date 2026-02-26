
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- CHECKING JAN LEGACY LINKS ---');

    // 1. Get Event Legacy ID
    const { data: events } = await supabase
        .from('ministry_events')
        .select('id, title, legacy_id')
        .eq('date', '2026-01-24');

    if (!events || events.length === 0) { console.log('Event not found'); return; }
    const event = events[0];
    console.log(`Event Legacy ID: ${event.legacy_id}`);

    if (event.legacy_id) {
        // 2. Check Service Attendance by Legacy ID
        const { count } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('legacy_service_id', event.legacy_id);

        console.log(`Service Attendance (Legacy Match): ${count}`);
    } else {
        console.log('No Legacy ID on this event.');
    }
}
check();
