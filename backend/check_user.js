const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    await client.connect();
    console.log("Connected to DB.");

    try {
        const { rows } = await client.query(`SELECT id, email, username, name, role, status FROM users WHERE email = $1 OR email ILIKE $1`, ['elizabethabuo23@gmail.com']);
        console.log("DB Matches for elizabethabuo23@gmail.com:");
        console.log(rows);
    } catch (e) {
        console.error("Test execution failed:", e);
    } finally {
        await client.end();
    }
}

run();
