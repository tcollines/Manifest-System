
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('--- CHECKING RLS POLICIES FOR personal_vehicles ---');

    // We can't easily query pg_policies via Supabase JS client unless we use RPC or raw SQL if enabled.
    // Instead, we can try to perform operations as an 'anon' or 'authenticated' user WITHOUT service role.

    const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || ''); // Assuming VITE_ var exists locally or we guess

    // Actually, let's just use a query to pg_policies if we can, or just try an insert/update as a simulated user.

    console.log("Attempting read as anon...");
    const { data, error } = await anonClient.from('personal_vehicles').select('*').limit(1);

    if (error) {
        console.log("Anon Read Failed:", error.message);
        console.log("RLS might be blocking access.");
    } else {
        console.log("Anon Read Success. Data length:", data.length);
    }

    // Try dummy insert as anon (should likely fail if RLS is good, or succeed if public)
    const testId = crypto.randomUUID();
    const { error: insertError } = await anonClient.from('personal_vehicles').insert([{
        id: testId,
        number_plate: 'TEST-RLS',
        driver_name: 'Tester',
        driver_contact: '256700000000',
        status: 'Absent'
    }]);

    if (insertError) {
        console.log("Anon Insert Failed:", insertError.message);
    } else {
        console.log("Anon Insert Success (WARNING: Public Write might be open, or you are signed in implicitly?)");
        // cleanup
        await supabase.from('personal_vehicles').delete().eq('id', testId);
    }
}

checkRLS();
