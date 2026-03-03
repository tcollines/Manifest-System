require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function recreateKoko() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: koko_pub } = await supabaseService.from('users').select('*').ilike('username', '%koko%').single();
    if (!koko_pub) {
        console.log("No koko found in public.users either.");
        return;
    }

    console.log("Found public Koko:", koko_pub.id, koko_pub.email);

    // forcefully kill any auth user with that exact UUID just in case it's a hidden ghost rejecting the email matching!
    console.log("Deleting identity by exact public ID...");
    const { error: delErr } = await supabaseService.auth.admin.deleteUser(koko_pub.id);
    if (delErr) console.log("Delete error (probably didn't exist, which is fine):", delErr.message);
    else console.log("Deleted existing identity mapping to public ID.");

    // Also try to find a user by email exactly in the list in case of case-sensitivity issues
    const { data: users } = await supabaseService.auth.admin.listUsers();
    const weirdKoko = users.users.find(u => u.email.toLowerCase() === koko_pub.email.toLowerCase());
    if (weirdKoko) {
        console.log("Found a weird email match with different ID:", weirdKoko.id);
        const { error: delErr2 } = await supabaseService.auth.admin.deleteUser(weirdKoko.id);
        if (delErr2) console.log("Failed to kill strange ghost:", delErr2);
        else console.log("Killed strange ghost identity!");
    }

    console.log("Re-creating clean identity for Koko...");
    // Native Supabase createUser creates a NEW UUID if not specified, which breaks the mapping!
    // Supabase JS actually does not let you specify the UUID via createUser directly in v2 normally without custom sql, except it DOES allow `id` in some subpackages or server-side. Wait, standard Supabase Auth REST doesn't guarantee UUID preservation via standard `createUser`. 
    // Wait! Since we already built `sync_passwords.js` which WORKS, let's use that exact SQL REST query logic we used to sync empty passwords!
    const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: koko_pub.id, // Explicit ID mapping!
            email: koko_pub.email,
            password: koko_pub.password,
            email_confirm: true,
            user_metadata: { role: koko_pub.role }
        })
    });

    const text = await res.text();
    console.log("Creation Response:", res.status, text);
}

recreateKoko().catch(console.error);
