require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function dumpHook() {
    console.log("--- DUMPING JWT HOOK ---");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // We can query pg_proc to get the function definition
    const { data, error } = await supabase.rpc('execute_sql', { sql: "SELECT prosrc, proname FROM pg_proc WHERE proname = 'custom_access_token_hook';" }).catch(() => ({ error: { message: 'RPC execute_sql does not exist' } }));

    if (error) {
        console.log("No raw RPC access. Let me use postgres direct or a REST query.");
        const { data: qData, error: qErr } = await supabase.from('pg_proc').select('prosrc, proname').eq('proname', 'custom_access_token_hook');
        if (qErr) {
            console.log("Could not query pg_proc directly:", qErr.message);
        } else {
            console.log(qData);
        }
    } else {
        console.log(data);
    }
}
dumpHook().catch(console.error);
