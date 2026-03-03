const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './frontend/.env' });
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const sql = fs.readFileSync('02_optimistic_locking.sql', 'utf8');

    // We already have "inline_code_block" RPC from Phase 1. 
    // If it requires text, we pass the raw SQL to it.
    const { data, error } = await supabase.rpc('inline_code_block', { sql_query: sql });

    if (error) {
        console.error("Migration failed:", error);
    } else {
        console.log("Migration successful!");
    }
}

run();
