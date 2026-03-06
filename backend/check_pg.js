const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    const res = await client.query("SELECT id, name, role, username, event_id FROM public.users ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}

run();
