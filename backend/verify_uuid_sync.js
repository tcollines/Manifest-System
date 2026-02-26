const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyDetailedSync() {
    const email = 'abratumwe@gmail.com';
    console.log(`--- Verifying Detailed Sync for ${email} ---`);

    // 1. Auth.Users
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === email);

    // 2. Public.Users
    const { data: publicUser, error: pubErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (!authUser) console.log("Auth user not found");
    if (!publicUser) console.log("Public user not found");

    if (authUser && publicUser) {
        console.log(`Auth ID:   '${authUser.id}'`);
        console.log(`Public ID: '${publicUser.id}'`);

        if (authUser.id === publicUser.id) {
            console.log("MATCH: IDs are identical.");
        } else {
            console.log("MISMATCH: IDs do not match!");
        }
    }
}

verifyDetailedSync();
