import dotenv from 'dotenv';
dotenv.config();

async function checkManifestIds() {
    console.log('Fetching database schema via Supabase REST API...');

    // We will use the REST API to query a custom RPC, 
    // but since we can't easily deploy an RPC right now without the pooler,
    // we'll try a different approach: simply fetching 1 row from every known table
    // and verifying if the 'manifest_id' property exists in the JSON response payload.

    const tables = [
        'users', 'members', 'children', 'ministry_events', 'pickup_stations',
        'vehicles', 'passengers', 'souls', 'service_attendance', 'volunteer_attendance',
        'incidents', 'personal_vehicles', 'department_requests', 'report_submissions',
        'requisitions', 'assets', 'transactions', 'monitoring_reports', 'healing_reports',
        'school_outreach_reports', 'next_gen_souls', 'children_attendance'
    ];

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('TABLE NAME'.padEnd(30, ' ') + ' | MANIFEST_ID COLUMN');
    console.log('----------------------------------------------------');

    for (const table of tables) {
        try {
            const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });

            if (!res.ok) {
                if (res.status === 404) {
                    console.log(table.padEnd(30, ' ') + ' | DOES NOT EXIST');
                } else {
                    console.log(table.padEnd(30, ' ') + ` | HTTP ERROR ${res.status}`);
                }
                continue;
            }

            const data = await res.json();

            if (data.length === 0) {
                // We securely fetch the columns by causing an intentional error or using the Prefer header
                // Alternatively, an empty array means we can't definitively check the keys of row 0. 
                // Let's use the REST API OPTIONS method to get the OpenAPI spec for that table.
                const optionsRes = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
                    method: 'OPTIONS',
                    headers: { 'apikey': supabaseKey }
                });

                // Supabase PostgREST returns a full OpenAPI JSON object on OPTIONS request
                const schema = await optionsRes.json();

                // Parse the OpenAPI definition for the table's properties
                // PostgREST maps the definition key to the table name
                const hasManifest = schema?.components?.schemas?.[table]?.properties?.manifest_id !== undefined;

                console.log(table.padEnd(30, ' ') + (hasManifest ? ' | ✅ EXISTS (Empty Table)' : ' | ❌ MISSING'));
            } else {
                const hasManifest = 'manifest_id' in data[0];
                console.log(table.padEnd(30, ' ') + (hasManifest ? ' | ✅ EXISTS (Populated)' : ' | ❌ MISSING'));
            }

        } catch (error) {
            console.log(table.padEnd(30, ' ') + ' | SCRIPT EXCEPTION');
        }
    }
}

checkManifestIds();
