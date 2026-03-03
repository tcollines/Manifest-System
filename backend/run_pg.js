require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
    // Determine the connection string from env vars. Supabase provides a direct DB connection string.
    // If not present, we will reconstruct it or ask the user.
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
    if (!process.env.DATABASE_URL) {
        console.log("No DATABASE_URL found for raw postgres. Will attempt local testing or user will need to run manually.");
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase external connects
    });

    try {
        await client.connect();
        const sqlPath = path.join(__dirname, '../02_optimistic_locking.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Running PG migration...");
        await client.query(sql);
        console.log("Migration Successful via Raw PG");
    } catch (err) {
        console.error("PG Runner Error:", err);
    } finally {
        await client.end();
    }
}

run();
