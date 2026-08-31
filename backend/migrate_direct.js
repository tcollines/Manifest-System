const { Client } = require('pg');

async function migrateDirect() {
    const directDsn = "postgres://postgres:ujrRGd5IZIKOE9Oj@db.poazorjmzswectxvakzl.supabase.co:5432/postgres";
    
    const client = new Client({
        connectionString: directDsn,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log("Applying manifest team leader columns directly...");
        await client.query(`
            ALTER TABLE manifests
            ADD COLUMN IF NOT EXISTS team_leader_name TEXT,
            ADD COLUMN IF NOT EXISTS team_leader_email TEXT,
            ADD COLUMN IF NOT EXISTS team_leader_contact TEXT;
        `);
        console.log("Columns added successfully!");
        
    } catch (e) {
        console.error("Direct migration error:", e);
    } finally {
        await client.end();
    }
}

migrateDirect();
