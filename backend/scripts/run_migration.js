require('dotenv').config();

const { Client } = require('pg');

async function runDirect() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected. Executing ALTER TABLE...");

        await client.query('ALTER TABLE public.souls ALTER COLUMN legacy_event_id DROP NOT NULL;');

        console.log("✅ ALTER TABLE successful.");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.end();
    }
}

runDirect();
