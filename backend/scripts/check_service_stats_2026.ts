
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!);

async function checkStats() {
    console.log('--- CHECKING 2026 SERVICE STATS ---');

    // Fetch events in 2026
    const { data: events, error } = await supabase
        .from('ministry_events')
        .select('*')
        .gte('date', '2026-01-01')
        .order('date', { ascending: true });

    if (error) { console.error(error); return; }

    let totalFirstTimersInStats = 0;

    console.log(`Found ${events.length} Events in 2026:`);
    console.table(events.map(e => ({
        date: e.date,
        id: e.id,
        ft_stat: e.stats?.firstTimers || 0
    })));

    events.forEach(e => {
        totalFirstTimersInStats += (e.stats?.firstTimers || 0);
    });

    console.log(`\nTOTAL FIRST TIMERS (From Service Stats): ${totalFirstTimersInStats}`);

    // Now let's try to find the members linked to these services
    const eventIds = events.map(e => e.id);

    // Count members whose first_timer_service_id is in this list
    const { count, error: countErr } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .in('first_timer_service_id', eventIds);

    console.log(`TOTAL MEMBERS with 'first_timer_service_id' in 2026 Events: ${count}`);

    // Also check joined_date
    const { count: dateCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('joined_date', '2026-01-01')
        .not('category', 'in', '("Next Gen","Child","Children")'); // Filter out kids

    console.log(`TOTAL MEMBERS with 'joined_date' >= 2026-01-01 (Adults): ${dateCount}`);
}

checkStats();
