require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkUsernameLogins() {
    console.log("--- INVESTIGATING USERNAME LOGINS ---");
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Check 'aine' vs another user e.g. 'tumweabra' or 'tom'
    const usernames = ['aine', 'tumweabra', 'abraham', 'tom'];

    const { data: users } = await supabaseService.from('users').select('id, username, email, role, status').in('username', usernames);

    const results = [];

    for (const u of users || []) {
        const { data: authUser } = await supabaseService.auth.admin.getUserById(u.id);
        if (authUser?.user) {
            results.push({
                db_username: u.username,
                db_email: u.email,
                auth_email: authUser.user.email,
                auth_confirmed: !!authUser.user.email_confirmed_at,
                has_password: !!authUser.user.encrypted_password,
                identities: authUser.user.identities?.map(i => i.provider)
            });
        }
    }

    fs.writeFileSync('aine_test.json', JSON.stringify(results, null, 2));
    console.log("Wrote aine_test.json");
}
checkUsernameLogins().catch(console.error);
