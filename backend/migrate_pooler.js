const { Client } = require('pg');

async function migratePooler5() {
    const dsn = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
    
    const client = new Client({
        connectionString: dsn,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query(`
            ALTER TABLE manifests
            ADD COLUMN IF NOT EXISTS team_leader_name TEXT,
            ADD COLUMN IF NOT EXISTS team_leader_email TEXT,
            ADD COLUMN IF NOT EXISTS team_leader_contact TEXT;
        `);
        console.log("Columns added successfully!");
    } catch (e) {
        console.error("Migration error:", e);
    } finally {
        await client.end();
    }
}

migratePooler5();
