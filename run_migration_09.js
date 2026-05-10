const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './frontend/.env' });
const fs = require('fs');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const sql = fs.readFileSync('09_performance_indexes.sql', 'utf8');

    const { data, error } = await supabase.rpc('inline_code_block', { sql_query: sql });

    if (error) {
        console.error("Migration failed:", error);
    } else {
        console.log("Migration successful!");
    }
}

run();
