require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL + '?sslmode=no-verify'
    });

    await client.connect();

    // We are going to directly update the auth.users table for Koko using the pgcrypto extension 
    // to crypt() the text 'Isaiah40:31' into a fresh bcrypt hash.

    const kokoPub = await client.query(`SELECT id, email, password FROM public.users WHERE username ILIKE '%Koko%' LIMIT 1`);
    if (kokoPub.rows.length === 0) {
        console.log("Koko not in public.users");
        return;
    }

    const koko = kokoPub.rows[0];
    console.log("Found Koko:", koko.id, koko.email, "Pwd:", koko.password);

    const checkAuth = await client.query(`SELECT id FROM auth.users WHERE id = $1 OR email ILIKE $2`, [koko.id, koko.email]);
    if (checkAuth.rows.length === 0) {
        console.log("She truly isn't in auth.users.");
        // We insert her directly!
        console.log("Inserting direct bypass into auth.users...");
        await client.query(`
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, app_metadata, user_metadata, is_super_admin, created_at, updated_at
            ) VALUES (
                $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, crypt($3, gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb, false, now(), now()
            )
         `, [koko.id, koko.email, koko.password]);
        console.log("Inserted!");
    } else {
        console.log("Auth user found with ID:", checkAuth.rows[0].id);
        console.log("Updating encrypted_password directly...");
        const res = await client.query(`UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = now() WHERE id = $2`, [koko.password, checkAuth.rows[0].id]);
        console.log("Updated rows:", res.rowCount);
    }

    await client.end();
}
run().catch(console.error);
