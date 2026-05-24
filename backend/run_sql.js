const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const dsn = process.env.DATABASE_URL;

// Replace port 6543 with 5432 for session mode
let sessionDsn = dsn.replace(':6543', ':5432');

const client = new Client({
    connectionString: sessionDsn,
    ssl: { rejectUnauthorized: false }
});

async function runSQL() {
    try {
        await client.connect();
        console.log("Connected securely to Supabase DB. Running migration...");
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
