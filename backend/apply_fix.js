const { Client } = require('pg');
require('dotenv').config();

async function run() {
    let url = process.env.DATABASE_URL;
    if (!url) {
        console.error("Missing DATABASE_URL");
        process.exit(1);
    }

    // Convert pooler connection (6543) to direct connection (5432) for schema operations
    url = url.replace(':6543/', ':5432/');
    console.log("Connecting using direct PG client to 5432...");

    const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected successfully to DB.");

        console.log("Dropping old role constraint...");
        await client.query(`ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;`);

        console.log("Adding new role constraint...");
        await client.query(`
        ALTER TABLE public.users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('Super Admin', 'Administrator', 'Coordinator', 'Resident Coordinator', 'Logistics', 'Member', 'TeamLeader'));
        `);

        console.log("Role 'Resident Coordinator' is now permitted!");

    } catch (e) {
        console.error("Migration Error:", e);
    } finally {
        await client.end();
    }
}

run();
