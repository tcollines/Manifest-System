
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAllColumns() {
    console.log('--- INSPECTING ALL COLUMN TYPES ---');

    // Trying to query information_schema directly via a raw RPC if available, 
    // OR just trying to infer from standard query if we can't access metadata.
    // Supabase JS doesn't support generic SQL query without RPC.

    // Plan B: iterating known tables is safer if we don't have a `run_sql` RPC.
    // But verify if we have `information_schema` access via `from`.

    // We already know `list_tables.js` failed to list tables generically, assuming restricted access.
    // So we will stick to the list of tables we know, but iterate ALL their columns.

    const TABLES = [
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
        'incidents'
    ];

    const results = {};

    for (const table of TABLES) {
        process.stdout.write(`Scanning ${table}... `);
        results[table] = [];

        // 1. Get a row to find all column names
        const { data: rows, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.log(`Error: ${error.message}`);
            continue;
        }

        if (rows.length === 0) {
            console.log('Empty table (cannot infer columns from data, skipping standard check)');
            // If empty, we can't easily check column names via select * unless we have inspection.
            // But we can check specifically for "current_service_id" or known suspects if we had a dictionary.
            // For now, note it's empty.
            continue;
        }

        const columns = Object.keys(rows[0]);
        console.log(`Found ${columns.length} columns.`);

        for (const col of columns) {
            // Filter: We care about columns that look like IDs
            // Criteria: Ends with 'id', 'uuid', or is 'id'
            const isIdLike = col.toLowerCase().endsWith('id') || col.toLowerCase().endsWith('uuid');

            if (isIdLike) {
                // Check Type via Injection Trick
                const { error: typeErr } = await supabase
                    .from(table)
                    .select(col)
                    .eq(col, 'not-a-uuid-check')
                    .limit(1);

                let type = 'TEXT (Inferred)';
                if (typeErr && typeErr.message.includes('invalid input syntax for type uuid')) {
                    type = 'UUID';
                }

                results[table].push({ column: col, type: type });
            }
        }
    }

    console.log('--- SCAN COMPLETE ---');
    fs.writeFileSync('full_schema_audit.json', JSON.stringify(results, null, 2));
}

inspectAllColumns();
