const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMismatch() {
    const email = 'abratumwe@gmail.com';
    console.log(`Checking accounts for ${email}`);

    // 1. Get auth user
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === email);

    if (authUser) {
        console.log(`Auth.Users ID:   ${authUser.id}`);
        console.log(`Auth.Users Sub: ${authUser.id}`);
    } else {
        console.log("No user found in auth.users");
    }

    // 2. Get public user
    const { data: publicUser, error: pubErr } = await supabase
        .from('users')
        .select('id, email, name, manifest_id')
        .eq('email', email)
        .single();

    if (publicUser) {
        console.log(`Public.Users ID: ${publicUser.id}`);
        console.log(`Public.Users Manifest ID: ${publicUser.manifest_id}`);
    } else {
        console.log("No user found in public.users");
    }
}

checkMismatch();
