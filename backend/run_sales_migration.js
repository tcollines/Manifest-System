const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const password = 'ujrRGd5IZIKOE9Oj';

// Using session pooler on port 5432
const client = new Client({
    connectionString: `postgres://postgres.poazorjmzswectxvakzl:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to database successfully via session pooler.");

        const sqlPath = '../frontend/database/28_fix_sales_rls.sql';
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing migration schema from ${sqlPath}...`);
        const res = await client.query(sql);
        console.log("Migration executed successfully!");

    } catch (err) {
        console.error("Error executing migration:", err.message);
    } finally {
        await client.end();
    }
}

run();
