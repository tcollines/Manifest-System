// run.js (Placed directly in backend folder)
require('dotenv').config(); // Picks up /backend/.env
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function run() {
    try {
        const sqlPath = path.join(__dirname, '../02_optimistic_locking.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Running migration...");
        const { data, error } = await supabase.rpc('inline_code_block', { sql_query: sql });
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
