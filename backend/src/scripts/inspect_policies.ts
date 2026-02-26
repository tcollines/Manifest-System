
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Hardcode absolute path to ensure certainty
const envPath = 'd:\\Manifest System\\backend\\.env';
dotenv.config({ path: envPath });

const run = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const sqlPath = path.resolve(__dirname, '../../database/list_rls_policies.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing policy inspection...`);
        const res = await client.query(sql);
        console.table(res.rows);

    } catch (err) {
        console.error('Inspection failed:', err);
    } finally {
        await client.end();
    }
};

run();
