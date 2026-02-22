const { Pool } = require('pg');

const dbUrl = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:5432/postgres"; // PORT 5432!
const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }, // Bypass SSL strict cert checks
    connectionTimeoutMillis: 5000
});

async function run() {
    try {
        console.log("Connecting to Supabase (Port 5432)...");
        const client = await pool.connect();
        console.log("Connected successfully!");

        // Query missing foreign keys
        const missingFKsQuery = `
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.update_rule,
                rc.delete_rule
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
                JOIN information_schema.referential_constraints AS rc
                ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
        `;

        const res = await client.query(missingFKsQuery);
        console.log("--- EXISTING FOREIGN KEYS ---");
        console.table(res.rows);

        client.release();
        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
}

run();
