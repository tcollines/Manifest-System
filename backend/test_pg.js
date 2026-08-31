require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        await client.connect();
        const res = await client.query(`SELECT 1 as test;`);
        console.log('Success:', res.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
check();
