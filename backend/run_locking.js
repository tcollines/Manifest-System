require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sqlPath = path.join(__dirname, '../02_optimistic_locking.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running migration...");
        const { data, error } = await sb.rpc('inline_code_block', { sql_query: sql });

        if (error) {
            console.error("Migration Failed:", error);
        } else {
            console.log("Migration Successful");
        }
    } catch (err) {
        console.error("Runner Error:", err);
    }
}

run();
