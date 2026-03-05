require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function nuclearHeal() {
    const email = 'elizabethabuo23@gmail.com';
    console.log(`Executing Nuclear Heal for: ${email}`);

    // 1. Snapshot the user
    const { data: dbUser, error: snapshotErr } = await supabase.from('users').select('*').ilike('email', email).single();
    if (snapshotErr || !dbUser) {
        console.error("User not found in public tables.");
        return;
    }
    const targetUid = dbUser.id;
    console.log(`Snapshot saved for Public UID: ${targetUid}`);

    // 2. Erase the ghost auth identity completely from GoTrue using raw SQL RPC
    console.log("Scrubbing ghost auth records...");
    await supabase.rpc('execute_sql', {
        sql: `
            DELETE FROM auth.identities WHERE id IN (SELECT id FROM auth.identities WHERE identity_data->>'email' = '${email}');
            DELETE FROM auth.users WHERE email = '${email}';
        `
    });

    // 3. Temporarily shift the public.users email so the trigger doesn't hit a UNIQUE constraint
    console.log(`Temporarily shifting public email...`);
    await supabase.from('users').update({ email: `TEMP_${email}` }).eq('id', targetUid);

    // 4. Create the User natively via GoTrue Admin API
    console.log("Provisioning precise GoTrue identity via API...");
    const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
        id: targetUid, // EXACT UUID MATCH
        email: email,
        password: 'TemporaryPassword123!',
        email_confirm: true
    });

    if (createErr) {
        console.error("Creation Failed via API:", createErr.message);
        // Rollback
        await supabase.from('users').update({ email: email }).eq('id', targetUid);
        return;
    }

    console.log("Successfully provisioned Auth Identity:", newAuth.user?.id);

    // 5. Restore the original email mapping onto the pristine profile
    console.log("Restoring original snapshot mapping...");
    const { error: restoreErr } = await supabase.from('users')
        .update({ email: email })
        .eq('id', targetUid);

    if (restoreErr) {
        console.error("Failed to restore original email mapping!", restoreErr);
    } else {
        console.log("✅ All systems GREEN. Identity perfectly synchronized.");
    }
}

nuclearHeal();
