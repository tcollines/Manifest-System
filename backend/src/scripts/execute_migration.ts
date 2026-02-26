
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Hardcode absolute path to ensure certainty
const envPath = 'd:\\Manifest System\\backend\\.env';
dotenv.config({ path: envPath });

console.log(`Loading .env from: ${envPath}`);
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('ERROR: DATABASE_URL is undefined.');
    process.exit(1);
}

// Masked Output for Debugging
const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
console.log(`Using Database URL: ${maskedUrl}`);


const run = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Supabase/Cloud PG check
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const sqlPath = path.resolve(__dirname, '../../database/department_authority_flip.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing migration from: ${sqlPath}`);
        await client.query(sql);
        console.log('Migration executed successfully.');

        // Verification
        const resDept = await client.query("SELECT id, name, legacy_id FROM departments LIMIT 5");
        console.table(resDept.rows);

        const resUser = await client.query("SELECT id, department_id FROM users WHERE department_id IS NOT NULL LIMIT 5");
        console.table(resUser.rows);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
};

run();
