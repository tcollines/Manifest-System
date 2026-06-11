require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
    const sql = fs.readFileSync('src/database/migrations/58_update_delete_event_cascade.sql', 'utf8');
    await client.query(sql);
    console.log("RPC updated successfully.");
    client.end();
}).catch(console.error);
