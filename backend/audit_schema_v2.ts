
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function auditSchema() {
    console.log("Auditing Schema via Record Inspection...");

    const tables = [
        'ministry_events',
        'pickup_stations',
        'vehicles',
        'passengers',
        'finance_transactions',
        'souls', // Might be 'next_gen_souls' or 'souls_won'? I saw 'next_gen_souls' in KI
        'next_gen_souls',
        'users',
        'user_roles'
    ];

    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);

        // Try to fetch 1 record
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.log(`Error querying ${table}:`, error.message);
        } else {
            if (data && data.length > 0) {
                const record = data[0];
                const keys = Object.keys(record);
                const hasEventId = keys.includes('event_id');
                const hasStationId = keys.includes('station_id');
                const hasVehicleId = keys.includes('vehicle_id');

                console.log(`Columns found: ${keys.join(', ')}`);
                console.log(`Has event_id: ${hasEventId}`);
                console.log(`Has station_id: ${hasStationId}`);
                console.log(`Has vehicle_id: ${hasVehicleId}`);
            } else {
                console.log(`Table ${table} is accessible but empty. Cannot infer columns from data.`);
                // If empty, we can try to insert a dummy record with invalid data and catch the error to see expected columns? 
                // No, that's risky.
                // We will assume it's empty for now.
            }
        }
    }
}

auditSchema();
