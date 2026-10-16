require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Client } = require('pg');
const fs = require('fs');

async function dumpHook() {
    const client = new Client({
        user: 'postgres.poazorjmzswectxvakzl',
        password: process.env.SUPABASE_DB_PASSWORD,
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query("SELECT prosrc FROM pg_proc WHERE proname = 'custom_access_token_hook'");
        if (res.rows.length > 0) {
            fs.writeFileSync('hook_output2.txt', res.rows[0].prosrc);
            console.log("WROTE hook_output2.txt");
        } else {
            console.log("Hook not found");
        }
    } catch (err) {
        fs.writeFileSync('hook_output2.txt', err.stack);
        console.error("PG Error");
    } finally {
        await client.end();
    }
}
dumpHook();
