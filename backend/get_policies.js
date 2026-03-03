require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('pg');

async function run() {
    console.log("Using DB URL:", process.env.DATABASE_URL?.split('@')[1]); // Log host part safely
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename IN ('vehicles', 'passengers')
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
