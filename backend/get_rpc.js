const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'd:/Manifest System/backend/.env' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
    return client.query("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'analytics_workflow_summary'");
}).then(res => {
    console.log(res.rows[0].pg_get_functiondef);
    client.end();
}).catch(console.error);
