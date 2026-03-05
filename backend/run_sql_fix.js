const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function runSQL() {
    await client.connect();
    console.log("Connected to DB.");

    try {
        const sql = fs.readFileSync('..\\06_fix_elizabeth.sql', 'utf8');
        await client.query(sql);
        console.log("SQL executed successfully!");
    } catch (e) {
        console.error("Test execution failed:", e);
    } finally {
        await client.end();
    }
}

runSQL();
