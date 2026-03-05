const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function runSQL() {
    await client.connect();
    console.log("Connected to DB to extract Trigger logic.");

    try {
        const { rows } = await client.query(`
            SELECT pg_get_functiondef(pg_proc.oid) AS trigger_source
            FROM pg_proc
            WHERE proname = 'on_auth_user_created' OR proname = 'handle_new_user'
        `);
        console.log("Trigger Defs:", rows.map(r => r.trigger_source).join('\n\n'));
    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await client.end();
    }
}

runSQL();
