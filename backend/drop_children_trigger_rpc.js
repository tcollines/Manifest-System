require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const query = `
    DROP TRIGGER IF EXISTS trg_sync_children_ids ON public.children;
    DROP FUNCTION IF EXISTS sync_children_ids();
  `;

    const { data, error } = await sb.rpc('exec_sql', { query });

    if (error) {
        console.error('RPC Error:', error.message);

        // Fallback: Check if there's a different function name we used.
        // Try supabase_rpc or similar
        console.log('We may safely ignore if function doesnt exist, but if it does fail here we need a hardcoded fix.');
    } else {
        console.log('Drop successful via RPC:', data);
    }
}
run();
