const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const sql = fs.readFileSync('09_performance_indexes.sql', 'utf8');

    // Try various common RPC names
    let res = await supabase.rpc('execute_sql', { sql: sql });
    if (!res.error) return console.log("Migration successful via execute_sql!");
    
    res = await supabase.rpc('exec_sql', { query: sql });
    if (!res.error) return console.log("Migration successful via exec_sql!");
    
    console.error("Migration failed. No execution RPC found.");
}

run();
