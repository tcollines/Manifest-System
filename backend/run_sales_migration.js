const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const password = process.env.SUPABASE_DB_PASSWORD;

// Using session pooler on port 5432
const client = new Client({
    connectionString: process.env.DATABASE_URL,
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
