
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- DIAGNOSING PRODUCTION PARKING SCHEMA ---');
    console.log(`URL: ${supabaseUrl}`);

    // 1. Check Table Info (Columns) using a hacky select or via rpc if available, 
    // but easiest is to insert a dummy and see what fails, or just select one and inspect keys.
    const { data: sample, error: fetchError } = await supabase.from('personal_vehicles').select('*').limit(1);

    if (fetchError) {
        console.error('Error fetching from personal_vehicles:', fetchError.message);
        return;
    }

    if (sample && sample.length > 0) {
        console.log('Sample Row Keys:', Object.keys(sample[0]));
        const row = sample[0];
        console.log(`Legacy ID exists? ${row.hasOwnProperty('legacy_id')}`);
        console.log(`Legacy Current Service ID exists? ${row.hasOwnProperty('legacy_current_service_id')}`);
        console.log(`Current Service ID type: ${typeof row.current_service_id}`);
    } else {
        console.log('Table is empty or RLS is blocking read (though we are using service role).');
    }

    // 2. Try to fetch stats to see if count works
    const { count, error: countError } = await supabase.from('personal_vehicles').select('*', { count: 'exact', head: true });
    if (countError) {
        console.error('Count error:', countError.message);
    } else {
        console.log(`Total Vehicles: ${count}`);
    }
}

diagnose();
