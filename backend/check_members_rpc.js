const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const sql = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'members' 
        AND table_schema = 'public';
    `;

    console.log("Checking columns for 'members'...");
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("Columns:", JSON.stringify(data, null, 2));
    }

    const rlsSql = `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE tablename = 'members' 
        AND schemaname = 'public';
    `;
    const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSql });
    if (rlsError) {
        console.error("RLS RPC Error:", rlsError);
    } else {
        console.log("RLS Status:", JSON.stringify(rlsData, null, 2));
    }
}

check();
