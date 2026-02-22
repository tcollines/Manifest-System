const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRLS() {
    console.log("--- Checking RLS on 'users' table ---");

    // Check if RLS is enabled
    // We can't query pg_tables directly without RPC, but we can try to query without the service role key 
    // to see if it returns results. 

    const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const { data, error, count } = await anonClient.from('users').select('*', { count: 'exact', head: true });

    if (error) {
        console.log("Anon query failed:", error.message);
    } else {
        console.log(`Anon query returned ${count} rows. If this is 0 but we have rows, RLS is active.`);
    }
}

checkRLS();
