
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Using Service Role to bypass RLS for data check
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Data Existence Check (Service Role) ---');

    const tables = ['ministry_events', 'members', 'children', 'souls', 'next_gen_souls'];

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) console.error(`[${table}] Error counting:`, error.message);
        else console.log(`[${table}] Total Records:`, count);

        // Sample one record to see ID formats
        const { data } = await supabase.from(table).select('id, legacy_id').limit(1);
        if (data && data.length > 0) {
            console.log(`[${table}] Sample:`, JSON.stringify(data[0]));
        }
    }

    console.log('\n--- RLS Policy Check ---');
    // We can't easily check RLS policies via JS client unless we use RPC or raw SQL.
    // Let's try to infer if RLS is the issue by trying a query with a simulated user if possible, 
    // OR just dump policies via SQL if possible.
    // Given previous steps, I'll use a direct PG query to list policies.
}

check();
