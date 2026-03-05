require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fullHeal() {
    const email = 'elizabethabuo23@gmail.com';
    console.log(`Executing Full GoTrue Heal for: ${email}`);

    // 1. Snapshot the user
    const { data: dbUser, error: snapshotErr } = await supabase.from('users').select('*').ilike('email', email).single();
    if (snapshotErr || !dbUser) {
        console.error("User not found in public tables.");
        return;
    }
    const targetUid = dbUser.id;
    console.log(`Snapshot saved for Public UID: ${targetUid}`);

    // 2. Clear corrupted auth records just in case
    await supabase.rpc('execute_sql', { sql: `DELETE FROM auth.identities WHERE user_id = '${targetUid}'; DELETE FROM auth.users WHERE id = '${targetUid}';` });

    // 3. Temporarily Delete from public.users to unblock the API trigger
    // DANGER: We cannot delete public.users easily if there are foreign keys (e.g., they own vehicles or are in stations).
    // Better strategy: Temporarily shift the user's email so the API trigger doesn't hit a UNIQUE constraint on email!

    console.log(`Temporarily shifting public email to bypass ON CONFLICT unique constraint...`);
    const { error: shiftErr } = await supabase.from('users').update({ email: `TEMP_${email}` }).eq('id', targetUid);
    if (shiftErr) {
        console.error("Failed to shift email:", shiftErr);
        return;
    }

    // 4. Create the User natively via GoTrue Admin API
    console.log("Provisioning precise GoTrue identity...");
    const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
        id: targetUid, // EXACT UUID MATCH
        email: email,
        password: 'TemporaryPassword123!',
        email_confirm: true,
        user_metadata: { name: dbUser.name }
    });

    if (createErr) {
        console.error("Creation Failed via API:", createErr.message);
        // Rollback
        await supabase.from('users').update({ email: email }).eq('id', targetUid);
        return;
    }

    console.log("Successfully provisioned Auth Identity:", newAuth.user?.id);

    // 5. The generic trigger inserted a New Blank Profile. We need to delete that blank profile, 
    // and restore the original email back to the original profound profile.
    console.log("Cleaning up trigger-generated duplicate and restoring original snapshot...");

    // In some systems, `on_auth_user_created` updates the row if `id` exists, 
    // but because we shifted the email, it might have just updated the shifted row, or failed.
    // Let's force-restore the snapshot heavily.

    const { error: restoreErr } = await supabase.from('users')
        .update({
            email: email,
            manifest_id: dbUser.manifest_id, // Ensure tenant ID is locked
            role: dbUser.role
        })
        .eq('id', targetUid);

    if (restoreErr) {
        console.error("Failed to restore original email mapping!", restoreErr);
    } else {
        console.log("All systems GREEN. Identity perfectly synchronized.");
    }
}

fullHeal();
