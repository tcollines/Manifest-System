import { resolve as resolveEnvPath } from 'path';

import { Client } from 'pg';
import dotenv from 'dotenv';

// Hardcode absolute path to ensure certainty
const envPath = resolveEnvPath(__dirname, '../../.env');
dotenv.config({ path: envPath });

const run = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        console.log("--- Departments (Should be UUIDs) ---");
        const resDept = await client.query("SELECT id, name, legacy_id FROM departments LIMIT 5");
        console.table(resDept.rows);

        console.log("--- Users (Should have UUID department_id) ---");
        const resUser = await client.query("SELECT id, department_id, department_uid FROM users WHERE department_id IS NOT NULL LIMIT 5");
        console.table(resUser.rows);

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await client.end();
    }
};

run();
