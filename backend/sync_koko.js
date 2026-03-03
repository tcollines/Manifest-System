require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function syncKoko() {
    console.log("Starting Koko Password Sync...");
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get Koko from public.users
    const { data: koko_pub, error: pubErr } = await supabaseService
        .from('users')
        .select('id, email, password')
        .ilike('username', '%Koko%')
        .single();

    if (pubErr || !koko_pub) {
        console.error("Could not fetch Koko from public.users:", pubErr);
        return;
    }

    console.log("Found Koko in public.users:", koko_pub.id, koko_pub.email);
    console.log("Target Password:", koko_pub.password);

    // 2. Fetch from auth.users via admin api
    const { data: listData, error: listErr } = await supabaseService.auth.admin.listUsers();
    if (listErr) {
        console.error("Failed to list auth users:", listErr);
        return;
    }

    const kokoAuth = listData.users.find(u =>
        u.email === koko_pub.email ||
        u.email.toLowerCase() === koko_pub.email.toLowerCase() ||
        u.id === koko_pub.id
    );

    if (!kokoAuth) {
        console.error("Koko genuinely does not exist in auth.users by email or ID. Creating new identity...");
        const { error: createErr } = await supabaseService.auth.admin.createUser({
            email: koko_pub.email,
            password: koko_pub.password,
            email_confirm: true
        });

        if (createErr) {
            console.error("Create User Error:", createErr.message);
        } else {
            console.log("Successfully created Koko in auth.users! (UUID will be desynchronized - check ghosts later)");
        }
    } else {
        console.log("Found Koko in auth.users! ID:", kokoAuth.id);
        console.log("Updating password...");

        const { error: updateErr } = await supabaseService.auth.admin.updateUserById(kokoAuth.id, {
            password: koko_pub.password
        });

        if (updateErr) {
            console.error("Update User Error:", updateErr.message);
        } else {
            console.log("- Successfully updated Koko's auth.users password!");
        }
    }
}

syncKoko().catch(console.error);
