
const { Client } = require('pg');

async function runDirect() {
    const client = new Client({
        connectionString: "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl",
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
