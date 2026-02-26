
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHealth() {
    console.log('--- Database Health Check ---\n');

    const tables = ['members', 'ministry_events', 'pickup_stations', 'vehicles', 'passengers', 'souls'];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`Error checking ${table}: ${error.message}`);
        } else {
            console.log(`Table: ${table} - Row Count: ${count}`);
        }
    }
}

checkHealth();
