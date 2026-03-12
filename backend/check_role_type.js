const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role';
        `);
        console.log('Column type:', res.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
check();
