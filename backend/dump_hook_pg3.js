require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Client } = require('pg');
const fs = require('fs');

async function dumpHook() {
    const directUrl = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.poazorjmzswectxvakzl.supabase.co:5432/postgres`;
    const client = new Client({
        connectionString: directUrl
    });

    try {
        await client.connect();
        const res = await client.query("SELECT prosrc FROM pg_proc WHERE proname = 'custom_access_token_hook'");
        if (res.rows.length > 0) {
            fs.writeFileSync('hook_output.txt', res.rows[0].prosrc);
            console.log("WROTE hook_output.txt");
        } else {
            console.log("Hook not found");
        }
    } catch (err) {
        fs.writeFileSync('hook_output.txt', err.message);
        console.error("PG Error");
    } finally {
        await client.end();
    }
}
dumpHook();
