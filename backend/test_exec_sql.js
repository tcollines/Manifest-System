const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testExecSql() {
    console.log("Checking for 'exec_sql' RPC...");

    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'submit_child_entry' LIMIT 1;"
        });

        if (error) {
            console.error("RPC 'exec_sql' failed:", error.message);
            console.log("This means I cannot run the migration automatically. I will provide the SQL for manual execution.");
        } else {
            console.log("Successfully called 'exec_sql'! Result:", data);

            console.log("Running migration...");
            const sql = fs.readFileSync(path.join(__dirname, 'database', '82_fix_child_rpc_uuid_mismatch.sql'), 'utf8');
            const { error: migError } = await supabase.rpc('exec_sql', { sql_query: sql });

            if (migError) {
                console.error("Migration failed via exec_sql:", migError.message);
            } else {
                console.log("Migration successful via exec_sql!");
            }
        }
    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

testExecSql();
