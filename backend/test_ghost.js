require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkGhostIdentities() {
    console.log("--- GHOST IDENTITY BY ID MATCH ---");
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // We know 'tumweabra@gmail.com' has public user ID 'bb36fcda-69f2-43c0-943f-d6b49ac30145'.
    // Let's directly check properties of whatever `signInWithIdToken` is fetching.

    // First, list ALL identities in the system.
    // auth.identities is hidden from RPC usually, but auth.admin.listUsers() gives us the tree.

    const { data: authUsers } = await supabaseService.auth.admin.listUsers();

    const googleUsers = authUsers?.users?.filter(u => u.identities && u.identities.some(i => i.provider === 'google'));

    console.log("--- ALL GOOGLE IDENTITIES ACROSS ENTIRE USERBASE ---");
    const out = googleUsers.map(gu => ({
        id: gu.id,
        email: gu.email,
        providers: gu.identities.map(i => i.provider),
        identityEmails: gu.identities.map(i => i.identity_data.email)
    }));

    fs.writeFileSync('all_google.json', JSON.stringify(out, null, 2));
    console.log("Wrote all_google.json");
}
checkGhostIdentities().catch(console.error);
