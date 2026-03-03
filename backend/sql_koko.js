require('dotenv').config();
const { Client } = require('pg');

async function forceKillKoko() {
    const dbUrl = process.env.DATABASE_URL + '?sslmode=no-verify';
    console.log("Connecting explicitly to Postgres bypass...");
    const client = new Client({ connectionString: dbUrl });

    try {
        await client.connect();
        const kokoEmail = 'Kweenkoko3@gmail.com';

        console.log("Searching for Ghost in auth.users by email lookup...");
        const res = await client.query('SELECT id, email FROM auth.users WHERE email ILIKE $1', [kokoEmail]);
        console.log("Ghosts found:", res.rows);

        if (res.rows.length > 0) {
            console.log("Executing strict DELETE on Ghost ID:", res.rows[0].id);
            await client.query('DELETE FROM auth.users WHERE id = $1', [res.rows[0].id]);
            console.log("Ghost purged from actual database securely!");
        } else {
            console.log("No ghosts holding this email in auth.users.");
        }
    } catch (e) {
        console.error("SQL Error:", e);
    } finally {
        await client.end();
    }
}

forceKillKoko().then(() => {
    // Now trigger recreate
    return fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: '3acd96fb-0ec1-4824-8149-dcd5d13da04d',
            email: 'Kweenkoko3@gmail.com',
            password: 'Isaiah40:31',
            email_confirm: true,
            user_metadata: { role: 'Member' }
        })
    });
}).then(res => res.text()).then(t => console.log('Final Recreate Status:', t)).catch(console.error);
