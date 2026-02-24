require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function debugAuth() {
    console.log("--- ENV CONTEXT AUDIT ---");
    console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
    console.log("SUPABASE_KEY (Anon):", !!process.env.SUPABASE_KEY, process.env.SUPABASE_KEY?.substring(0, 15) + '...');
    console.log("SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 15) + '...');

    const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    console.log("\\n--- SUPABASE AUTH LOGIN TEST ---");
    // Testing with the specific user 'aine' which user mentioned, or we can just query to find their email
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: userError } = await supabaseService
        .from('users')
        .select('email, username')
        .eq('username', 'aine')
        .maybeSingle();

    if (userError || !userData) {
        console.log("❌ Failed to find user 'aine' in public.users:", userError || "Not found");

        // Let's just grab ANY user to test login if 'aine' doesn't exist.
        const { data: anyUser } = await supabaseService.from('users').select('email, username').limit(1).maybeSingle();
        console.log("Using fallback user for testing parity:", anyUser);
    } else {
        console.log("✅ Found user 'aine':", userData.email);
    }
}

debugAuth().catch(console.error);
