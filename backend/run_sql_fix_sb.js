require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runSQL() {
    try {
        const sql = fs.readFileSync('..\\07_delete_event_rpc.sql', 'utf8');
        const { data, error } = await supabase.rpc('execute_sql', { sql });

        if (error) {
            console.error("RPC Error executing SQL:", error);
        } else {
            console.log("SQL executed successfully via execute_sql RPC!");
        }
    } catch (e) {
        console.error("Test execution failed:", e);
    }
}

runSQL();
