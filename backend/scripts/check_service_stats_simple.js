
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
    console.log('--- CHECK (SIMPLE) ---');
    const { data: events } = await supabase
        .from('ministry_events')
        .select('*')
        .gte('date', '2026-01-01')
        .order('date', { ascending: true });

    let total = 0;
    for (const e of events) {
        const ft = e.stats?.firstTimers || 0;
        total += ft;
        // Short output
        console.log(`${e.date}:${ft}`);
    }
    console.log(`TOTAL: ${total}`);

    // Check Member Table Logic
    const ids = events.map(e => e.id);
    if (ids.length > 0) {
        const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .in('first_timer_service_id', ids)
            .not('category', 'in', '("Next Gen","Child","Children")');
        console.log(`MEMBERS_LINKED: ${count}`);
    }
}
checkStats();
