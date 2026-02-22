const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugAuthSync() {
    console.log("--- Checking Sync for ebbmanifestaine2@gmail.com ---");
    const email = 'ebbmanifestaine2@gmail.com';

    // 1. Check auth.users
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
        console.error("Auth list error:", authErr);
        return;
    }

    const authUser = users.find(u => u.email === email);
    if (!authUser) {
        console.log(`User ${email} not found in auth.users`);
    } else {
        console.log(`Auth User ID: ${authUser.id}`);
        console.log(`Auth Metadata:`, authUser.user_metadata);
    }

    // 2. Check public.users
    const { data: publicUser, error: pubErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (pubErr) {
        console.log(`User ${email} not found in public.users or error:`, pubErr.message);
    } else {
        console.log(`Public User ID: ${publicUser.id}`);
        console.log(`Public Manifest ID: ${publicUser.manifest_id}`);
        console.log(`Public Name: ${publicUser.name}`);
    }

    if (authUser && publicUser && authUser.id !== publicUser.id) {
        console.error("CRITICAL: ID MISMATCH between auth.users and public.users!");
    }
}

debugAuthSync();
