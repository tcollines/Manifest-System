
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function test() {
    const connectionString = process.env.DATABASE_URL;
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        const res = await client.query('SELECT 1 as result');
        console.log('Test Select Result:', res.rows[0]);
    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        await client.end();
    }
}

test();
