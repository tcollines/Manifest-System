
const { Client } = require('pg');
require('dotenv').config();

async function run() {
    console.log("Connecting to:", process.env.DATABASE_URL ? "DATABASE_URL Present" : "DATABASE_URL Missing");

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // Supabase requires SSL
        connectionTimeoutMillis: 10000
    });

    try {
        await client.connect();

        const query = `
            SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
            FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name 
              AND tc.table_schema = kcu.table_schema
            WHERE tc.table_name IN ('children', 'incidents')
            ORDER BY tc.table_name, tc.constraint_type;
        `;

        const res = await client.query(query);
        console.table(res.rows);

        console.log("\n--- JSON OUTPUT ---");
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error("Error executing query", err.stack);
    } finally {
        await client.end();
    }
}

run();
