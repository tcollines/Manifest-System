import fs from 'fs';
import pg from 'pg';
const { Client } = pg;

const password = "ujrRGd5IZIKOE9Oj";
const directUrl = `postgres://postgres.poazorjmzswectxvakzl:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

const client = new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    const sql = fs.readFileSync('migrations/18_add_campus_tables.sql', 'utf8');
    await client.query(sql);
    console.log("Migration executed!");
    await client.end();
}
run().catch(console.error);
