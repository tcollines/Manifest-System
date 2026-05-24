const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const sqlFile = process.argv[2];
        const sqlPath = sqlFile || '../frontend/database/26_add_sales_reservations.sql';
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing migration schema from ${sqlPath} using RPC...`);
        const { data, error } = await supabase.rpc('inline_code_block', { sql_query: sql });
        if (error) {
            console.error("Migration Failed via inline_code_block:", error);
            // Fallback: maybe just try pg client directly with port 5432 and the IP of pooler
        } else {
            console.log("Migration executed successfully!");
        }

    } catch (err) {
        console.error("Error executing migration:", err);
    }
}

run();
