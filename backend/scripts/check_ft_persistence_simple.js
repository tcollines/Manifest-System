
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- CHECKING FT PERSISTENCE (SIMPLE) ---');

    // 1. Fetch members with non-null ID
    const { data: members, error } = await supabase
        .from('members')
        .select('id, name, category, joined_date, first_timer_service_id')
        .neq('first_timer_service_id', null) // Try this syntax
        .limit(5);

    if (error) { console.error(error); return; }

    if (!members || members.length === 0) {
        // Try filtering in memory if database filter fails?
        // Or just fetch all and see
        console.log('No members found with .neq(null). Fetching all and filtering...');
        const { data: all } = await supabase.from('members').select('*').limit(100);
        const linked = all.filter(m => m.first_timer_service_id);
        if (linked.length === 0) {
            console.log('Zero linked members found in first 100.');
            return;
        }
        console.log(`Found ${linked.length} linked members (in sample).`);
        processMembers(linked);
        return;
    }

    console.log(`Found ${members.length} linked members (via Query).`);
    processMembers(members);
}

async function processMembers(members) {
    for (const m of members) {
        // Fetch event manually
        const { data: events } = await supabase
            .from('ministry_events')
            .select('id, title, date')
            .eq('id', m.first_timer_service_id);

        const evt = events ? events[0] : null;

        console.log(`Member: ${m.name} (${m.category})`);
        console.log(`  Joined: ${m.joined_date}`);
        console.log(`  FT Event: ${evt ? evt.title : 'N/A'}`);
        console.log(`  FT Date:  ${evt ? evt.date : 'N/A'}`);
        // Check if dates match
        const match = evt && (m.joined_date === evt.date || m.joined_date.startsWith(evt.date));
        console.log(`  Match? ${match ? 'YES' : 'NO'}`);
        console.log('---');
    }
}

check();
