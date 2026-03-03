require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testMagicLinkFallback() {
    console.log("--- INVESTIGATING MAGIC LOGIN EXPLOIT ---");
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // We established that `tumweabra@gmail.com` connects as "Admin".
    // Let's explicitly check the DB user `tumweabra@gmail.com` and its ID map again.
    const { data: publicUser } = await supabaseService.from('users').select('*').eq('email', 'tumweabra@gmail.com').maybeSingle();

    console.log("PUBLIC USER tumweabra@gmail.com exists with role:", publicUser?.role); // We know this is "Admin"

    // If the React frontend calls `supabase.auth.signInWithIdToken({ provider: 'google', token })`
    // and the token is valid, Supabase MUST return a session.
    // If Supabase returns a session but Auth.users has NO Google identities... 
    // Wait. Does `listUsers` hide identities? No.

    // Let's directly get the specific `auth.users` row for tumweabra.
    const { data: authUser } = await supabaseService.auth.admin.getUserById(publicUser.id);

    if (authUser.user) {
        console.log("AUTH USER EXACT DUMP:");
        console.log("Email:", authUser.user.email);
        console.log("Identities Array:", JSON.stringify(authUser.user.identities, null, 2));
        console.log("Last Sign In:", authUser.user.last_sign_in_at);
        console.log("Created:", authUser.user.created_at);
    } else {
        console.log("NO EXACT MATCHING AUTH USER FOUND for public ID:", publicUser.id);
    }
}
testMagicLinkFallback().catch(console.error);
