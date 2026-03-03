const fs = require('fs');
const { Client } = require('pg');

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

const client = new Client({
    connectionString: dsn,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected securely to DB! Running DROP TRIGGER...");
        const query = `
          DROP TRIGGER IF EXISTS trg_sync_children_ids ON public.children;
          DROP FUNCTION IF EXISTS sync_children_ids();
        `;
        await client.query(query);
        console.log("Trigger successfully dropped!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
