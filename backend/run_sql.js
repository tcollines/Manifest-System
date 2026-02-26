const fs = require('fs');

const env = fs.readFileSync('d:\\Manifest System\\backend\\.env', 'utf8');
const getEnv = (key) => {
    const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
};
const dsn = getEnv('DATABASE_URL');

if (!dsn) {
    console.error("No DATABASE_URL found");
    process.exit(1);
}

const { Client } = require('pg');
const client = new Client({
    connectionString: dsn,
    ssl: { rejectUnauthorized: false }
});

async function runSQL() {
    try {
        await client.connect();
        console.log("Connected securely to Supabase DB. Running migration...");
        const sql = fs.readFileSync('d:\\Manifest System\\backend\\database\\80_deduplicate_and_soft_delete_users.sql', 'utf8');
        await client.query(sql);
        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await client.end();
    }
}

runSQL();
