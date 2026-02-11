
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking legacy_id Nullability ---');
    const tables = ['members', 'ministry_events', 'pickup_stations', 'vehicles', 'passengers', 'service_attendance', 'souls'];

    for (const table of tables) {
        // We use a simple select to check if we can insert NULL
        // But better is to check the actual schema via a view or if we have an exec_sql RPC
        // Since npx -e failed, let's try a direct query if possible, or just list 1 row.
        const { data, error } = await supabase
            .from('members') // Just as a conduit for RPC or similar
            .select('id') // Dummy
            .limit(1);

        // Actually, let's try to find an RPC that gives us schema or just use npx ts-node on a file
    }

    // Definitive test: Try to insert a dummy event with NULL legacy_id in a transaction (if possible)
    // or just check the columns via a known RPC.
    // Wait, I saw 'exec_sql' was missing in schema cache earlier. 

    // Let's just try to insert a dummy event and see the error.
    console.log('Testing dummy event insertion with NULL legacy_id...');
    const { error: insError } = await supabase
        .from('ministry_events')
        .insert([{
            title: 'TEMP_TEST_DELETE_ME',
            type: 'Service',
            date: '2026-02-10',
            time: '12:00',
            location: 'TEST',
            legacy_id: null
        }]);

    if (insError) {
        console.log('❌ Insertion Failed:', insError.message);
        console.log('   Code:', insError.code);
    } else {
        console.log('✅ Insertion Succeeded (legacy_id is nullable).');
        // Clean up
        await supabase.from('ministry_events').delete().eq('title', 'TEMP_TEST_DELETE_ME');
    }
}

check();
