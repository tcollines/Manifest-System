
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkColumn() {
    console.log("Checking Schema...");

    const tables = ['vehicles', 'passengers', 'users', 'transactions'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('event_id').limit(1);
        if (error) {
            console.error(`Column 'event_id' check failed for table '${table}':`, error.message);
        } else {
            console.log(`Column 'event_id' EXISTS in table '${table}'.`);
        }
    }
}

checkColumn();
