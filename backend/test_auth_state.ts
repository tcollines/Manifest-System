import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing SUPABASE env vars.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    const email = 'tcollines004@gmail.com';
    const password = 'Password123!';

    console.log("Attempting standard password login just to see error code...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: "Anything_Because_It_Doesnt_Exist"
    });

    console.log("Password login error:", error);

    // Now check if the user actually exists in the auth table via service key
    const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!roleKey) {
        console.error("Missing service role key");
        return;
    }
    const adminClient = createClient(SUPABASE_URL, roleKey);
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === email);
    console.log("Auth user exists? ", !!user);
    if (user) {
        console.log("User identities:", user.identities);
    }
}

run();
