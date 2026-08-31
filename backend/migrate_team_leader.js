const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        
        console.log("Applying manifest team leader columns...");
        await client.query(`
            ALTER TABLE manifests
            ADD COLUMN IF NOT EXISTS team_leader_name TEXT,
            ADD COLUMN IF NOT EXISTS team_leader_email TEXT,
            ADD COLUMN IF NOT EXISTS team_leader_contact TEXT;
        `);
        console.log("Columns added successfully!");
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

migrate();
