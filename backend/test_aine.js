require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkUsernameLogins() {
    console.log("--- INVESTIGATING USERNAME LOGINS ---");
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Check 'aine' vs another user e.g. 'tumweabra' or 'tom'
    const usernames = ['aine', 'tumweabra', 'abraham', 'tom'];

    console.log("\\n1. Querying public.users for exact username match");
    const { data: users } = await supabaseService.from('users').select('id, username, email, role, status').in('username', usernames);

    console.log(users);

    console.log("\\n2. Querying auth.users via admin.getUserById for identity sync");
    for (const u of users || []) {
        const { data: authUser } = await supabaseService.auth.admin.getUserById(u.id);
        if (authUser?.user) {
            console.log(`\\n- DB Username: ${u.username}`);
            console.log(`  Auth Email: ${authUser.user.email}`);
            console.log(`  Auth Confirmed: ${!!authUser.user.email_confirmed_at}`);
            console.log(`  Auth Encrypted Password Exists: ${authUser.user.encrypted_password ? 'YES' : 'NO'}`);
            console.log(`  Auth Identities: ${JSON.stringify(authUser.user.identities?.map(i => i.provider))}`);
        }
    }
}
checkUsernameLogins().catch(console.error);
