const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const sqlPath = path.join(__dirname, 'frontend/database/29_emergency_security_lockdown.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Trying to execute via exec_sql RPC...");
    let res = await supabase.rpc('exec_sql', { sql: sql });
    if (!res.error) return console.log("✅ Migration successful via exec_sql!");
    console.error("exec_sql failed:", res.error);
    
    console.log("Trying to execute via execute_sql RPC...");
    res = await supabase.rpc('execute_sql', { query: sql });
    if (!res.error) return console.log("✅ Migration successful via execute_sql!");
    console.error("execute_sql failed:", res.error);
}

run();
