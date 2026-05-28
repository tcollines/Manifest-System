const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const password = 'ujrRGd5IZIKOE9Oj';

// Using session pooler on port 5432 with SSL
const client = new Client({
    connectionString: `postgres://postgres.poazorjmzswectxvakzl:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to database successfully via session pooler.");

        const sqlPath = path.join(__dirname, '../frontend/database/29_emergency_security_lockdown.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing emergency lockdown from ${sqlPath}...`);
        const res = await client.query(sql);
        console.log("✅ Lockdown executed successfully!");

    } catch (err) {
        console.error("❌ Error executing lockdown:", err.message);
    } finally {
        await client.end();
    }
}

run();
