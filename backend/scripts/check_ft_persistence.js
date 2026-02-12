
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- CHECKING FT PERSISTENCE ---');

    // Find a member who has a first_timer_service_id
    const { data: members } = await supabase
        .from('members')
        .select(`
            id, 
            name, 
            category, 
            joined_date, 
            first_timer_service_id,
            ministry_events!first_timer_service_id (id, date, title)
        `)
        .not('first_timer_service_id', 'is', null)
        .limit(5);

    if (!members || members.length === 0) {
        console.log('No members with FT Link found to verify.');
        return;
    }

    console.log(`Found ${members.length} linked members.`);

    members.forEach(m => {
        const evt = m.ministry_events; // joined data
        console.log(`Member: ${m.name} (${m.category})`);
        console.log(`  Joined: ${m.joined_date}`);
        console.log(`  FT Event: ${evt ? evt.title : 'N/A'}`);
        console.log(`  FT Date:  ${evt ? evt.date : 'N/A'}`);
        console.log('---');
    });
}

check();
