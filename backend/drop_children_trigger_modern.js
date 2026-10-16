require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

const env = fs.readFileSync(require('path').resolve(__dirname, '.env'), 'utf8');
const url = env.match(/DATABASE_URL=(.*)/)?.[1]?.trim();

// Original: postgres://postgres.poazorjmzswectxvakzl:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl
// New format: postgres://postgres.[ref]:<password>@[ref].pooler.supabase.com:5432/postgres
const projectRef = 'poazorjmzswectxvakzl';
const pMatch = url.match(/:([^:@]+)@/);
const password = pMatch[1];

const newDsn = process.env.DATABASE_URL;
console.log('Using modern pooler URL:', newDsn.replace(/:([^:@]+)@/, ':***@'));

const client = new Client({
    connectionString: newDsn,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected securely to modern DB pooler! Running DROP TRIGGER...");
        const query = `
          DROP TRIGGER IF EXISTS trg_sync_children_ids ON public.children;
          DROP FUNCTION IF EXISTS sync_children_ids();
        `;
        await client.query(query);
        console.log("Trigger successfully dropped!");
    } catch (err) {
        console.error("Error:", err.message);

        // Let's also try port 6543 just in case
        console.log('Attempting port 6543 transaction pooler...');
        const client2 = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        try {
            await client2.connect();
            await client2.query(query);
            console.log('Trigger dropped via 6543!');
        } catch (err2) {
            console.error('Port 6543 Error:', err2.message);
        } finally {
            await client2.end();
        }
    } finally {
        await client.end();
    }
}

run();
