require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const connectionString = process.env.DATABASE_URL;
    console.log('Connecting securely to Supabase DB...');

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected! Executing drop...');

        const query = `
      DROP TRIGGER IF EXISTS trg_sync_children_ids ON public.children;
      DROP FUNCTION IF EXISTS sync_children_ids();
    `;
        const res = await client.query(query);
        console.log('Success! Trigger and function removed.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}
run();
