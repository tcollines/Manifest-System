require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function healIdentity() {
    const email = 'elizabethabuo23@gmail.com';
    console.log(`Healing Identity for: ${email}`);

    // 1. Get the target DB Identity UUID
    const { data: dbUser, error: dbErr } = await supabase.from('users').select('id, manifest_id, role').ilike('email', email).single();
    if (dbErr || !dbUser) {
        console.error("User not found in public tables.");
        return;
    }
    const targetUid = dbUser.id;
    console.log(`Target Public UID: ${targetUid}`);

    // clear out the manual SQL insertions that broke the auth state
    await supabase.rpc('execute_sql', { sql: `DELETE FROM auth.identities WHERE user_id = '${targetUid}'; DELETE FROM auth.users WHERE id = '${targetUid}';` });
    console.log("Scrubbed corrupted Auth records.");

    // Using the official Supabase Admin API to create the user with the EXACT UUID
    // Wait, the Admin API *does* let you specify `id` in `createUser`!
    const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
        id: targetUid, // EXACT UUID MATCH
        email: email,
        password: 'TemporaryPassword123!', // Google SSO will bypass this anyway
        email_confirm: true,
        app_metadata: {
            manifest_id: dbUser.manifest_id,
            provider: 'email',
            providers: ['email', 'google']
        }
    });

    if (createErr) {
        // If we get an error here, it's usually because the `on_auth_user_created` Postgres trigger 
        // tries to insert a duplicate key into `public.users`.
        console.error("Creation Failed via API (Likely Trigger Collision):", createErr.message);

        // Let's attempt to temporarily disable the trigger, create the user, and re-enable it.
        console.log("Attempting trigger-bypass fallback...");
        const bypassSql = `
            ALTER TABLE public.users DISABLE TRIGGER ALL;
            -- We cannot call the GoTrue API from inside SQL, but we can instruct the user to do it,
            -- or we can just delete from public.users, let the API create it, and then update the public.users record!
        `;
        console.log(bypassSql);
    } else {
        console.log("Successfully provisioned Auth Identity:", newAuth.user?.id);
    }
}

healIdentity();
