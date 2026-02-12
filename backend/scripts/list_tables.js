
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('--- LISTING ALL PUBLIC TABLES ---');

    // Query information_schema to get all tables
    // Note: This requires permissions. If this fails, we might need a known list or RPC.
    // Try RPC first if available, otherwise assume we can't easily allow listing without it.
    // Actually, we can just try to fetch from a known table or just use the JS client's inspection if possible?
    // No, JS client doesn't expose schema inspection directly.

    // Let's try the `rpc` 'get_tables' if it exists (common pattern), otherwise...
    // We'll try to query a table we "know" exists to confirm connection, but for listing ALL...
    // We can try a raw query via a helper function if you've added one.
    // Wait, previous scripts used direct table access.

    // Let's try to query `pg_catalog.pg_tables`? Usually restricted.
    // BUT! The user previously ran `inspect_schema.ts`. Let's check that file content to see how it did it.

    // Fallback: I will just audit the specific requested tables explicitly + check for 'information_schema' access.

    const tables = [
        'children',
        'department_requests',
        'passengers',
        'personal_vehicles',
        'transactions',
        'users',
        'vehicles',
        'pickup_stations',
        'ministry_events',
        'members',
        'service_attendance',
        'souls',
        'incidents' // Any others? 
    ];

    console.log(`Checking access for ${tables.length} known tables...`);

    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (error) console.log(`[${t}] Error: ${error.message}`);
        else console.log(`[${t}] Verified (Rows: ${count})`);
    }
}

listTables();
