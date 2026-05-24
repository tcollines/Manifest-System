const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

const password = 'ujrRGd5IZIKOE9Oj';
const connectionString = `postgres://postgres:${password}@db.poazorjmzswectxvakzl.supabase.co:5432/postgres`;

const client = new Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to database successfully.");

        const sqlFile = process.argv[2];
        const sqlPath = sqlFile || '../frontend/database/26_add_sales_reservations.sql';
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing migration schema from ${sqlPath}...`);
        const res = await client.query(sql);
        console.log("Migration executed successfully!");

    } catch (err) {
        console.error("Error executing migration:");
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
