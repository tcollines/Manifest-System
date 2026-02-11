
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
    console.log('--- Phase 3B: Executing Schema Authority Flip ---');
    const sqlFile = path.resolve(__dirname, '../database/55_phase_3b_schema_swap.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected.');

        console.log('Executing migration script...');
        // Execute the entire SQL as a single block (it contains BEGIN/COMMIT)
        await client.query(sql);

        console.log('✅ Phase 3B Migration Successful!');
        await client.end();
    } catch (err: any) {
        console.error('❌ Migration Failed:', err.message);
        if (err.detail) console.error('Detail:', err.detail);
        if (err.hint) console.error('Hint:', err.hint);
        process.exit(1);
    }
}

runMigration();
