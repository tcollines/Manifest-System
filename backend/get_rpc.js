require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query("SELECT pg_get_functiondef('submit_member_entry'::regproc);");
    console.log(res.rows[0].pg_get_functiondef);
    await client.end();
}
run().catch(console.error);
