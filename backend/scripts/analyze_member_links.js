
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
    console.log('--- ANALYZING MEMBER LINKS ---');

    // 1. Get the 78 Members (Joined 2026, Not Kids)
    // Using simple date filter as proxy for the report list
    const { data: members } = await supabase
        .from('members')
        .select('id, name, first_timer_service_id')
        .not('category', 'in', '("Next Gen","Child","Children")')
        .gte('joined_date', '2026-01-01');

    console.log(`Analyzing ${members.length} Members...`);

    const linkMap = {};
    const missingLink = [];

    members.forEach(m => {
        if (!m.first_timer_service_id) {
            missingLink.push(m.id);
        } else {
            linkMap[m.first_timer_service_id] = (linkMap[m.first_timer_service_id] || 0) + 1;
        }
    });

    console.log(`Members with NO Link: ${missingLink.length}`);
    console.log(`Members with Link: ${members.length - missingLink.length}`);

    // Resolve IDs to Titles
    const startIds = Object.keys(linkMap);
    if (startIds.length > 0) {
        const { data: events } = await supabase
            .from('ministry_events')
            .select('id, title, type, date')
            .in('id', startIds);

        console.log('\n--- BREAKDOWN BY EVENT ---');
        events.forEach(e => {
            const count = linkMap[e.id];
            console.log(`[${e.type}] ${e.title} (${e.date}): ${count}`);
        });
    }
}
analyze();
