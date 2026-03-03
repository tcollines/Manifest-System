require('dotenv').config();
const { Client } = require('pg');

async function trimUsernames() {
    const directUrl = 'postgresql://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require';
    const client = new Client({
        connectionString: directUrl
    });

    try {
        await client.connect();
        const res = await client.query("UPDATE public.users SET username = BTRIM(username) WHERE username <> BTRIM(username)");
        console.log(`Trimmed ${res.rowCount} usernames directly in Postgres!`);
    } catch (err) {
        console.error("PG Error:", err.message);
    } finally {
        await client.end();
    }
}

trimUsernames();
