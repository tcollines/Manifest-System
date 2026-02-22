const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
    console.log("--- Checking RLS Policies for 'users' ---");
    const query = `
        SELECT
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE tablename = 'users';
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
    if (error) {
        console.error("Error checking policies (RPC exec_sql might be missing):", error.message);
        // Fallback: search for a way to run SQL or assume common policies
    } else {
        console.log("Policies:", JSON.stringify(data, null, 2));
    }
}

checkPolicies();
