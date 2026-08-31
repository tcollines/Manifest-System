require('dotenv').config();
const { Client } = require('pg');
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
async function run() {
    await client.connect();
    const resAuth = await client.query("SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_schema = 'auth' AND event_object_table = 'users'");
    console.log('--- Auth Triggers ---');
    console.log(resAuth.rows);
    const resPub = await client.query("SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_schema = 'public' AND event_object_table = 'users'");
    console.log('--- Public Triggers ---');
    console.log(resPub.rows);
    await client.end();
}
run().catch(console.error);
