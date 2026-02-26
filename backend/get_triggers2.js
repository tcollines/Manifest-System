const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
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
