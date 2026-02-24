const fs = require('fs');

const env = fs.readFileSync('d:\\Manifest System\\backend\\.env', 'utf8');
const dsnMatch = env.match(/DATABASE_URL=(.*)/);
const dsn = dsnMatch ? dsnMatch[1].trim() : '';

const { Client } = require('pg');
const client = new Client({ connectionString: dsn, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();
    // Using exact string matching to bypass injection issues
    try {
        const res = await client.query("SELECT id, email, username, name FROM users WHERE email ILIKE '%abraham%' OR email ILIKE '%collines%'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
