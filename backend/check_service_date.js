require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await sb.from('ministry_events')
        .select('id, title, date, created_at')
        .eq('id', '54c02c5c-e934-4e06-a14b-696d9b5ecdf7')
        .single();

    if (error) {
        console.error(error);
    } else {
        console.table([data]);
    }
}
run();
