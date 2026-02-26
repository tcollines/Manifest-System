
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testConn() {
    const connectionString = process.env.DATABASE_URL;
    console.log(`Connecting to: ${connectionString?.split('@')[1]}`); // Mask password

    // Try to strip the options part if present
    const cleanConn = connectionString?.split('?')[0];

    const client = new Client({
        connectionString: cleanConn,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log("SUCCESS: Connected to DB!");
        const res = await client.query('SELECT current_database(), current_user');
        console.log(res.rows[0]);
    } catch (e: any) {
        console.error("FAIL:", e.message);
    } finally {
        await client.end();
    }
}

testConn();
