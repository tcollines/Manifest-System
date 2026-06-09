const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: 'd:\\Manifest System\\backend\\.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('ministry_events').select('id, title, type, date').order('date', { ascending: true });
    console.log(JSON.stringify(data, null, 2));
}
run();
