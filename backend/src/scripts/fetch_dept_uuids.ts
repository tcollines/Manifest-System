
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Hardcode absolute path
const envPath = 'd:\\Manifest System\\backend\\.env';
dotenv.config({ path: envPath });

const run = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query("SELECT id, slug, name FROM departments ORDER BY name");
        console.log("--- COPIABLE DATA ---");
        console.log(JSON.stringify(res.rows, null, 2));
        console.log("---------------------");
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
};

run();
