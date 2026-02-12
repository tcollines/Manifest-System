
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- INSPECTING EVENT TYPES ---');

    // Get distinct types from ministry_events in 2026
    const { data: events } = await supabase
        .from('ministry_events')
        .select('type, title, date')
        .gte('date', '2026-01-01');

    const types = [...new Set(events.map(e => e.type))];
    console.log('Found Types:', types);

    // Show sample of each
    types.forEach(t => {
        const sample = events.find(e => e.type === t);
        console.log(`Type: ${t} -> Sample: ${sample.title} (${sample.date})`);
    });
}

inspect();
