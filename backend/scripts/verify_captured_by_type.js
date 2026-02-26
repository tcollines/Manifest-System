
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
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'souls' 
            AND column_name = 'captured_by';
        `);
        console.table(res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

inspect();
