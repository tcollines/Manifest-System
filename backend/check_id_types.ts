
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkIdTypes() {
    console.log("Checking ID types...");

    const tables = ['ministry_events', 'pickup_stations', 'vehicles'];

    for (const table of tables) {
        // We can't easily get the type definition via JS client without RPC or information_schema access (which failed before).
        // However, we can fetch a record and check the typeof the ID in JS, though that distinguishes string vs number, not text vs uuid.
        // UUIDs come as strings in JS.
        // But the error explicitly said "incompatible types: uuid and text". This confirms ministry_events.id is TEXT in Postgres.

        // Let's try to verify if it *looks* like a UUID or just a random string.
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (data && data.length > 0) {
            console.log(`${table}.id example:`, data[0].id);
        } else {
            console.log(`${table} is empty or error:`, error?.message);
        }
    }
}

checkIdTypes();
