
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectionString = (process.env.DATABASE_URL || '').trim();

async function run() {
    console.log('--- Connecting to DB (Pure JS) ---');
    if (!connectionString) {
        console.error('Missing DATABASE_URL');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connection Successful!');

        const sql = fs.readFileSync(path.resolve(__dirname, '../database/52_harden_uuid_schema.sql'), 'utf8');
        console.log('--- Executing SQL ---');
        await client.query(sql);
        console.log('✅ Migration Applied Successfully.');
    } catch (err) {
        console.error('❌ FAILED:', err.message);
        if (err.code === 'XX000') {
            console.log('Hint: "Tenant not found" usually means the project ref in the URL or options is wrong.');
        }
    } finally {
        await client.end();
    }
}

run();
