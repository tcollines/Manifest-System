
const { Client } = require('pg');
require('dotenv').config();

// Use the exact same config structure that worked in debug_db.js
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

async function run() {
    try {
        console.log("Connecting...");
        await client.connect();
        console.log("Connected! Querying FKs...");

        const res = await client.query(`
            SELECT 
                tc.table_name, 
                kcu.column_name,
                tc.constraint_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND ccu.table_name = 'users'
              AND ccu.table_schema = 'public';
        `);

        console.log("\n--- COMPLETE LIST OF TABLES REFERENCING USERS ---");
        // Print as JSON to avoid truncation/table formatting issues
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error("Audit Error:", err.message);
        if (err.code) console.error("Code:", err.code);
    } finally {
        await client.end();
    }
}

run();
