
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

async function run() {
    try {
        console.log("Connecting...");
        await client.connect();
        console.log("Connected! Starting Forensic Audit for 'personal_vehicles'...");

        // 1. Data Profile
        const profileRes = await client.query(`
            SELECT 
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE id ~* '^[0-9a-f-]{36}$') AS valid_uuid,
              COUNT(*) FILTER (WHERE id !~* '^[0-9a-f-]{36}$') AS legacy_count
            FROM personal_vehicles;
        `);
        console.log("\n--- DATA PROFILE ---");
        console.table(profileRes.rows);

        // 2. Foreign Key Dependencies
        const fkRes = await client.query(`
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
              AND ccu.table_name = 'personal_vehicles'
              AND ccu.table_schema = 'public';
        `);

        console.log("\n--- REFERENCING TABLES (Foreign Keys) ---");
        if (fkRes.rows.length === 0) {
            console.log("No explicit Foreign Keys found pointing to personal_vehicles.");
        } else {
            console.table(fkRes.rows);
        }

        // 3. Suspected "Soft" Relationships (Column names implying reference)
        console.log("\n--- SUSPECTED SOFT DEPENDENCIES (Scanning for 'vehicle_id' columns) ---");
        const softRes = await client.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE column_name LIKE '%vehicle_id%' 
            AND table_name != 'personal_vehicles'
            AND table_schema = 'public';
        `);
        console.table(softRes.rows);

    } catch (err) {
        console.error("Audit Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
