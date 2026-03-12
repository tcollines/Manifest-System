const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();

        console.log("Adding 'Resident Coordinator' to role constraints...");

        const q1 = `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;`;
        await client.query(q1);
        console.log("Dropped old constraint.");

        const q2 = `
        ALTER TABLE public.users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('Super Admin', 'Administrator', 'Coordinator', 'Resident Coordinator', 'Logistics', 'Member', 'TeamLeader'));
        `;
        await client.query(q2);
        console.log("Added new constraint with 'Resident Coordinator'!");

    } catch (e) {
        console.error("Migration Error:", e);
    } finally {
        await client.end();
    }
}

run();
