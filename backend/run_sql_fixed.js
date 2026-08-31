require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

const dsn = process.env.DATABASE_URL;

const client = new Client({
    connectionString: dsn,
    ssl: { rejectUnauthorized: false }
});

async function runSQL() {
    try {
        await client.connect();
        console.log("Connected securely to Supabase DB pooler session port. Running migration...");
        const sqlFile = process.argv[2] || '../frontend/database/26_add_sales_reservations.sql';
        const sql = fs.readFileSync(sqlFile, 'utf8');
        await client.query(sql);
        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await client.end();
    }
}

runSQL();
