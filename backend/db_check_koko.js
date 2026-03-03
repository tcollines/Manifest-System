require('dotenv').config();
const { Client } = require('pg');

async function checkKokoSQL() {
    const dbUrl = process.env.DATABASE_URL + '?sslmode=disable';
    const client = new Client({ connectionString: dbUrl });

    try {
        await client.connect();
        const { rows } = await client.query(`
            SELECT id, email, length(email) as elen, 
                   encode(encrypted_password::bytea, 'hex') as passhash,
                   email_confirmed_at IS NOT NULL as confirmed
            FROM auth.users 
            WHERE email ILIKE '%koko%'
        `);
        console.log("Found Ghosts:", rows.length);
        console.log(rows);
    } catch (e) {
        console.error("SQL Error:", e);
    } finally {
        await client.end();
    }
}
checkKokoSQL();
