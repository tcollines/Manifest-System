require('dotenv').config();
const { Client } = require('pg');

async function test() {
    console.log("Testing Pooler Session Mode...");
    const connectionString = process.env.DATABASE_URL;

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Session Mode Connected!");
        const res = await client.query("SELECT 1 as num;");
        console.log("✅ Query successful:", res.rows[0].num);
    } catch (e) {
        console.log("❌ Error:", e.message);
    } finally {
        await client.end();
    }
}
test();
