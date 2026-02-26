
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function sumStats() {
    console.log('--- SUMMING SERVICE FIRST TIMERS ---');

    // 1. Get all Services (Not Events) in 2026
    const { data: services } = await supabase
        .from('ministry_events')
        .select('id, title, date, stats')
        .gte('date', '2026-01-01')
        .neq('type', 'Event')
        .order('date', { ascending: true });

    if (!services) { console.log('No services.'); return; }

    let totalStats = 0;
    let totalLinked = 0;

    console.log(`Found ${services.length} Services.`);
    console.log('Date       | Title          | Stats FT | Linked Members');
    console.log('-----------|----------------|----------|---------------');

    for (const s of services) {
        const statCount = s.stats?.firstTimers || 0;

        // Count actual members linked
        const { count: linkedCount } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('first_timer_service_id', s.id);

        console.log(`${s.date} | ${s.title.padEnd(14)} | ${statCount.toString().padEnd(8)} | ${linkedCount}`);

        totalStats += statCount;
        totalLinked += (linkedCount || 0);
    }

    console.log('-------------------------------------------------------');
    console.log(`GRAND TOTAL (Stats):  ${totalStats}`);
    console.log(`GRAND TOTAL (Linked): ${totalLinked}`);
}

sumStats();
