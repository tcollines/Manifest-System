require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Must use ANON key for client-side Auth simulation
const supabase = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const email = 'elizabethabuo23@gmail.com';
    console.log(`Checking GoTrue directly for ${email}...`);

    try {
        // Need to simulate what happens during signIn, but we don't have her JWT token.
        // Instead, let's just trigger a magic link or check if her account is actually banned.
        const { data, error } = await supabase.auth.signInWithOtp({ email });

        console.log("OTP Request Result:", data, error);
    } catch (e) {
        console.error("Test execution failed:", e);
    }
}

run();
