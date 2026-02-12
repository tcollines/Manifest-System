
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
    console.log('--- ANALYZING DIRECT MEMBERS (No FT Service ID) ---');

    // Fetch members joined in 2026 who coincide with 'Member' category but NO first_timer_service_id
    const { data: members, error } = await supabase
        .from('members')
        .select('id, name, joined_date, created_at')
        .not('category', 'in', '("Next Gen","Child","Children")')
        .gte('joined_date', '2026-01-01')
        .eq('category', 'Member')
        .is('first_timer_service_id', null);

    if (error) { console.error(error); return; }

    console.log(`Found ${members.length} Direct Members.`);

    const dist = {};
    members.forEach(m => {
        // Use joined_date to group
        const month = m.joined_date.substring(0, 7);
        dist[month] = (dist[month] || 0) + 1;
    });

    console.log('Joined Date Distribution:', dist);

    // Also check created_at just in case joined_date is backdated or future-dated
    const createdDist = {};
    members.forEach(m => {
        const month = m.created_at.substring(0, 7);
        createdDist[month] = (createdDist[month] || 0) + 1;
    });
    console.log('Created At Distribution:', createdDist);
}

analyze();
