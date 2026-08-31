require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
});

async function run() {
    try {
        console.log("--- INDEXES ---");
        const res = await pool.query(`
            SELECT tablename, indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename IN ('members', 'transactions', 'passengers', 'vehicles', 'coordinators', 'ministry_events', 'service_attendance', 'users', 'pickup_stations');
        `);
        console.log("Indexes fetched successfully (" + res.rows.length + " found).");
        for (let r of res.rows) {
            console.log(`[${r.tablename}] ${r.indexname}`);
        }

        console.log("\n--- EXPLAIN: members (ILIKE search) ---");
        const expMembers = await pool.query(`
            EXPLAIN 
            SELECT * FROM members 
            WHERE manifest_id = '87a71142-d6f9-46f4-b4a8-9ae8163fcf02' 
            AND name ILIKE '%john%';
        `);
        console.log(expMembers.rows.map(r => r["QUERY PLAN"]).join('\n'));

        console.log("\n--- EXPLAIN: vehicles (UUID search) ---");
        const expVehicles = await pool.query(`
            EXPLAIN 
            SELECT * FROM vehicles 
            WHERE manifest_id = '87a71142-d6f9-46f4-b4a8-9ae8163fcf02' 
            AND event_id = '12345678-1234-1234-1234-123456789012';
        `);
        console.log(expVehicles.rows.map(r => r["QUERY PLAN"]).join('\n'));

        console.log("\n--- EXPLAIN: service_attendance (JOIN simulation) ---");
        const expAtt = await pool.query(`
            EXPLAIN 
            SELECT * FROM service_attendance 
            WHERE manifest_id = '87a71142-d6f9-46f4-b4a8-9ae8163fcf02' 
            AND service_id = '12345678-1234-1234-1234-123456789012';
        `);
        console.log(expAtt.rows.map(r => r["QUERY PLAN"]).join('\n'));

        console.log("\n--- EXPLAIN: OR conditions (vehicles) ---");
        const expOr = await pool.query(`
            EXPLAIN 
            SELECT * FROM vehicles 
            WHERE manifest_id = '87a71142-d6f9-46f4-b4a8-9ae8163fcf02' 
            AND (event_id = '12345678-1234-1234-1234-123456789012' 
                 OR legacy_event_id = 'legacy123');
        `);
        console.log(expOr.rows.map(r => r["QUERY PLAN"]).join('\n'));

    } catch (err) {
        console.error("DB Error:", err.message);
    } finally {
        await pool.end();
    }
}

run();
