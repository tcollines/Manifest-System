
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function audit() {
    console.log('--- AUDIT: STATS vs ACTUAL ROWS (2026) ---');
    console.log('Service | Date       | UI Stat (FT) | Actual Rows (FT) | Gap');
    console.log('--------|------------|--------------|------------------|----');

    // 1. Get all events/services
    const { data: events } = await supabase
        .from('ministry_events')
        .select('id, title, date, stats')
        .gte('date', '2026-01-01')
        .order('date', { ascending: true });

    let totalStat = 0;
    let totalRows = 0;

    for (const e of events) {
        const uiStat = e.stats?.firstTimers || 0;

        // 2. Count ACTUAL rows in service_attendance linked to this event
        // Note: We need to know if they are First Timers. 
        // service_attendance usually links to a member. The member has 'category'.
        // Or service_attendance might have a 'category' or 'is_first_timer' flag?
        // Let's check service_attendance schema briefly via selecting one row?
        // Actually, usually First Timer count is derived from Members linked via 'first_timer_service_id' 
        // OR Members who checked in with category 'First Timer'.

        // Strategy A: Count Members who claim this is their first timer service
        const { count: ftLinkCount } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('first_timer_service_id', e.id);

        // Strategy B: Count Check-ins (Attendance) where member is First Timer
        // This is harder without a join. 
        // Let's assume the "System of Truth" for First Timers is the 'first_timer_service_id' link.

        const actual = ftLinkCount;
        const gap = uiStat - actual;

        if (uiStat > 0 || actual > 0) {
            console.log(`${e.title.padEnd(7)} | ${e.date} | ${uiStat.toString().padEnd(12)} | ${actual.toString().padEnd(16)} | ${gap}`);
        }

        totalStat += uiStat;
        totalRows += actual;
    }

    console.log('------------------------------------------------------------');
    console.log(`TOTAL   |            | ${totalStat.toString().padEnd(12)} | ${totalRows.toString().padEnd(16)} | ${totalStat - totalRows}`);
}

audit();
