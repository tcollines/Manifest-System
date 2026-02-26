
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function auditSchema() {
    console.log("Auditing Schema via Record Inspection (Round 3)...");

    const tables = [
        'transactions', // Corrected from finance_transactions
        'souls',
        'next_gen_souls'
    ];

    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);

        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.log(`Error querying ${table}:`, error.message);
        } else {
            if (data && data.length > 0) {
                const record = data[0];
                const keys = Object.keys(record);
                const hasEventId = keys.includes('event_id');

                console.log(`Columns structure: ${keys.join(', ')}`);
                console.log(`Has event_id: ${hasEventId}`);

                // For Souls, check specific columns mapping to event
                if (table === 'souls') {
                    console.log(`Source Type: ${record.source_type}`);
                    console.log(`Source ID: ${record.source_id}`);
                }
            } else {
                console.log(`Table ${table} is accessible but empty.`);
            }
        }
    }
}

auditSchema();
