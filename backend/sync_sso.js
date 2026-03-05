require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncIdentity(email) {
    console.log(`Synchronizing Identity for: ${email}`);

    // 1. Get the DB Identity
    const { data: dbUser, error: dbErr } = await supabase.from('users').select('id, manifest_id, role').ilike('email', email).single();
    if (dbErr || !dbUser) {
        console.error("User not found in public tables.");
        return;
    }
    console.log("Found Public UID:", dbUser.id);

    // 2. Get the GoTrue Identity
    const { data: authData } = await supabase.auth.admin.listUsers();
    const wrongAuthUser = authData.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (wrongAuthUser && wrongAuthUser.id !== dbUser.id) {
        console.log("Removing misaligned auto-generated GoTrue identity:", wrongAuthUser.id);
        await supabase.auth.admin.deleteUser(wrongAuthUser.id);
    }

    // 3. Create the correctly aligned Identity
    console.log("Provisioning precise GoTrue identity...");
    const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
        id: dbUser.id,
        email: email,
        email_confirm: true,
        app_metadata: {
            manifest_id: dbUser.manifest_id,
            provider: 'email',
            providers: ['email'] // Allows Google to piggyback on this email
        }
    });

    if (createErr) {
        if (createErr.message.includes("already registered")) {
            console.log("Identity is actually perfectly aligned!");
        } else {
            console.error("Failed to provision:", createErr);
        }
    } else {
        console.log("Successfully bound new Auth UID to legacy DB UID:", newAuth.user?.id);
    }
}

syncIdentity("elizabethabuo23@gmail.com");
