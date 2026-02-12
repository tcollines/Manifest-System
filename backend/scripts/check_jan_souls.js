
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- CHECKING JAN 2026 SOULS ---');

    // Check souls created in Jan 2026
    const { count, data } = await supabase
        .from('souls')
        .select('*', { count: 'exact', head: false })
        .gte('created_at', '2026-01-01')
        .lt('created_at', '2026-02-01');

    console.log(`Souls recorded in Jan 2026: ${count}`);

    // Also check if they have a specific 'event_id' matching Jan 24
    // Get Jan 24 event id first
    const { data: events } = await supabase.from('ministry_events').select('id').eq('date', '2026-01-24');

    if (events && events.length > 0) {
        const evtId = events[0].id;
        const { count: evtSouls } = await supabase
            .from('souls')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', evtId);

        console.log(`Souls linked to Jan 24 Event: ${evtSouls}`);
    }
}

check();
