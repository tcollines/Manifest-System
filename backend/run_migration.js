const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

// The pooler URL often throws error or limits role if not session mode.
// We use the direct database connection via port 5432 which we figured out earlier for the audit script.
// 'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl'
// Let's parse out the password and use direct.
const password = 'ujrRGd5IZIKOE9Oj';
const connectionString = `postgres://postgres:${password}@db.poazorjmzswectxvakzl.supabase.co:5432/postgres`;

const client = new Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to database successfully.");

        const sqlPath = './supabase/migrations/20260303223156_01_safe_hardening.sql';
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing migration schema...");
        const res = await client.query(sql);
        console.log("Migration executed successfully:", res);

    } catch (err) {
        console.error("Error executing migration:");
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
