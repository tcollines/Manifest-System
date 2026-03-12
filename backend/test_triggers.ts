import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing DB credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTriggers() {
    // Check if the user exists in public.users first
    const { data: user } = await supabase.from('users').select('*').eq('email', 'tcollines004@gmail.com').single();
    if (user) {
        console.log("PUBLIC USER FOUND:");
        console.log("Role:", user.role);
        console.log("Department:", user.department_id);
    } else {
        console.log("No public user found.");
    }

    // Now let's try reading the auth trigger directly from pg_proc using a direct SQL query
    // To do this we need to use a raw query which is only supported via postgres driver or specific RPCs.
    // Since we don't have a direct driver, we can use the `rpc` function if we have run_sql enabled,
    // but the previous attempt showed it's missing.

    // Instead, let's look for how `handle_new_user` handles roles.
    console.log("Let's try to add a raw auth user to see what the trigger does to the public table...");
    const { data: newAuth, error: authErr } = await supabase.auth.admin.createUser({
        email: 'test_trigger2@manifest.local',
        password: 'password123',
        email_confirm: true
    });

    console.log("Auth creation attempt:", authErr || "Success");
    if (newAuth.user) {
        // Wait for trigger to fire
        await new Promise(r => setTimeout(r, 1000));
        const { data: insertedPub } = await supabase.from('users').select('*').eq('id', newAuth.user.id).single();
        console.log("Trigger inserted public record:", insertedPub);

        // Clean up
        await supabase.auth.admin.deleteUser(newAuth.user.id);
        await supabase.from('users').delete().eq('email', 'test_trigger2@manifest.local');
    }
}

checkTriggers();
