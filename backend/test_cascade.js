require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
    const res = await client.query("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'delete_event_cascade'");
    console.log(res.rows[0]);
    client.end();
}).catch(console.error);
