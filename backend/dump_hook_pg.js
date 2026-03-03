require('dotenv').config();
const { Client } = require('pg');

async function dumpHook() {
    console.log("--- NATIVE NATIVE HOOK DUMP ---");
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        const res = await client.query("SELECT prosrc FROM pg_proc WHERE proname = 'custom_access_token_hook'");
        if (res.rows.length > 0) {
            console.log(res.rows[0].prosrc);
        } else {
            console.log("Hook function not found.");
        }
    } catch (err) {
        console.error("PG Connection/Query Error:", err.message);
    } finally {
        await client.end();
    }
}

dumpHook();
