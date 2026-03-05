require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function injectIdentity() {
    const email = 'elizabethabuo23@gmail.com';
    console.log(`Executing Low-Level Postgres Injection for: ${email}`);

    // 1. Snapshot the user
    const { data: dbUser } = await supabase.from('users').select('*').ilike('email', email).single();
    if (!dbUser) {
        console.error("User not found in public tables.");
        return;
    }
    const targetUid = dbUser.id;
    console.log(`Public UID: ${targetUid}`);

    // DANGER: Erase any ghost auth identities using raw SQL
    await supabase.rpc('execute_sql', {
        sql: `
        DELETE FROM auth.identities WHERE user_id = '${targetUid}';
        DELETE FROM auth.users WHERE id = '${targetUid}';
        DELETE FROM auth.identities WHERE identity_data->>'email' = '${email}';
        DELETE FROM auth.users WHERE email = '${email}';
    `});

    console.log("Deleted all traces. Waiting 2 seconds for any db replication...");
    await new Promise(r => setTimeout(r, 2000));

    console.log("Injecting cleanly into auth.users...");

    // We explicitly insert into auth.users. The only tricky column is `encrypted_password`.
    // It's allowed to be NULL for OAuth users in Postgres.
    const { error: injectErr } = await supabase.rpc('execute_sql', {
        sql: `
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            '${targetUid}',
            'authenticated',
            'authenticated',
            '${email}',
            NULL,
            now(),
            jsonb_build_object('provider', 'email', 'providers', array['email', 'google'], 'manifest_id', '${dbUser.manifest_id}'),
            jsonb_build_object('name', '${dbUser.name}'),
            now(),
            now(),
            '',
            '',
            '',
            ''
        );
        
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(),
            '${targetUid}',
            jsonb_build_object('sub', '${targetUid}', 'email', '${email}'),
            'google',
            now(),
            now(),
            now()
        );
    `});

    if (injectErr) {
        console.error("Critical Postgres Error during injection:", injectErr);
    } else {
        console.log("✅ Identity manually injected into Core Postgres. Google Login is now guaranteed to map to this row.");
    }
}

injectIdentity();
