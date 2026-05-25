const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const sqlPath = '../frontend/database/28_fix_sales_rls.sql';
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing migration schema from ${sqlPath} using RPC...`);
        let res = await supabase.rpc('exec_sql', { sql_query: sql });
        if (res.error) {
            console.log("exec_sql (sql_query) failed:", res.error.message);
            res = await supabase.rpc('exec_sql', { sql: sql });
            if (res.error) {
               console.log("exec_sql (sql) failed:", res.error.message);
               res = await supabase.rpc('inline_code_block', { sql_query: sql });
               if (res.error) {
                   console.error("Migration Failed on all RPCs.");
                   return;
               }
            }
        }
        
        console.log("Migration executed successfully!");
    } catch (err) {
        console.error("Error executing migration:", err);
    }
}

run();
