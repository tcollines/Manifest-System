
const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function inspect() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
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
