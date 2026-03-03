require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await sb.from('children')
        .select('id, name, parent_contact, category, is_first_timer, joined_date, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error(error);
    } else {
        console.table(data);
    }
}
run();
