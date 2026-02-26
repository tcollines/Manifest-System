
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
    console.log('--- CHECKING 2026 SERVICE STATS (Chunked) ---');

    const { data: events, error } = await supabase
        .from('ministry_events')
        .select('*')
        .gte('date', '2026-01-01')
        .order('date', { ascending: true });

    if (error) { console.error(error); return; }

    let totalFirstTimersInStats = 0;

    // Log each event
    for (const e of events) {
        const ft = e.stats?.firstTimers || 0;
        totalFirstTimersInStats += ft;
        console.log(`Date: ${e.date} | Title: ${e.title} | FT Stat: ${ft}`);
    }

    console.log(`\nTOTAL Expected FT (Sum of Stats): ${totalFirstTimersInStats}`);

    // Check Member Table Logic
    const eventIds = events.map(e => e.id);
    if (eventIds.length === 0) { console.log('No events.'); return; }

    const { count: ftById } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .in('first_timer_service_id', eventIds)
        .not('category', 'in', '("Next Gen","Child","Children")');

    const { count: ftByDate } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('joined_date', '2026-01-01')
        .eq('category', 'First Timer'); // Correct .eq usage

    console.log(`Members with FT Service ID in 2026 Events: ${ftById}`);
    console.log(`Members with 'joined_date' >= 2026 (Category='First Timer'): ${ftByDate}`);
}

checkStats();
