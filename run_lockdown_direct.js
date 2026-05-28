const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const password = 'ujrRGd5IZIKOE9Oj';
const projectId = 'poazorjmzswectxvakzl';

// Direct connection to the database instance (bypassing pooler)
const client = new Client({
    connectionString: `postgres://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to database successfully via DIRECT HOST.");

        const sqlPath = path.join(__dirname, 'frontend/database/29_emergency_security_lockdown.sql');
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
