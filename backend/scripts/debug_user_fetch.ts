
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserFetch() {
    console.log('--- DEBUGGING USER FETCH ---');

    // Simulate UserStore.getAll()
    // It calls /users, which in turn calls supabase.from('users').select('*')

    // We will use the service role key here, which bypasses RLS. 
    // If this works, but frontend fails, it's RLS.
    // If this fails/returns nulls, it's DB data.

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'Logistics');

    if (error) {
        console.error("Error fetching users:", error.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No Logistics users found via Supabase Client.");
        return;
    }

    console.log(`Found ${users.length} Logistics users (Service Role).`);
    const sample = users[0];
    console.log("Sample Data (Service Role):", JSON.stringify(sample, null, 2));

    // Now, let's try to simulate a restricted fetch if possible? 
    // We can't easily simulate the anon/user role here without a valid JWT.
    // But we can check if RLS is enabled on the table.

    const { data: rlsCheck, error: rlsError } = await supabase
        .rpc('get_rls_status', { table_name: 'users' });

    // Supabase doesn't have a built-in RPC for this usually, unless we made one.
    // Instead we can query pg_class/pg_policy if we had direct access, but we are using the client.

    // Let's just output the station_id check
    if (sample.station_id) {
        console.log("✅ station_id is present in DB response.");
    } else {
        console.log("❌ station_id is MISSING or NULL in DB response.");
    }

    // Check specific user from screenshot if possible? 
    // "Lydia Ddembe" was found in previous step.
}

debugUserFetch();
