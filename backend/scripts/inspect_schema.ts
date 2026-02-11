
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('--- Phase 3B: Schema Inspection ---\n');

    const tables = ['ministry_events', 'pickup_stations', 'vehicles', 'passengers', 'souls'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1).maybeSingle();
        if (error) console.error(`Error fetching ${table}:`, error.message);
        else if (data) console.log(`${table} Columns:`, Object.keys(data));
        else console.log(`${table} is empty.`);
    }
}

inspectSchema();
