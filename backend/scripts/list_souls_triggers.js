
const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function inspect() {
    const client = new Client({
        connectionString: "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@44.216.29.125:5432/postgres?options=project%3Dpoazorjmzswectxvakzl",
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement, action_timing
            FROM information_schema.triggers 
            WHERE event_object_table = 'souls' 
            AND event_object_schema = 'public';
        `);
        console.table(res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

inspect();
