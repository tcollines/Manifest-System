
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '').replace(/[\r\n\s\t]/g, '');

if (!connectionString) {
    console.log('--- Environment Check ---');
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
    console.error('Missing DATABASE_URL in .env');
    process.exit(1);
}

async function runMigration() {
    console.log('--- Connecting to database ---');
    console.log('URL Length:', connectionString.length);

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected.');

        const sqlPath = path.resolve(__dirname, '../database/52_harden_uuid_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('--- Executing Migration ---');
        await client.query(sql);
        console.log('✅ Success.');

    } catch (err: any) {
        console.error('🛑 FAILED:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
