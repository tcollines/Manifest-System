import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('❌ ERROR: DATABASE_URL is not set in environment variables.');
    process.exit(1);
}

const run = async () => {
    console.log(`Connecting to database via DATABASE_URL...`);
    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected successfully!');

        const migrationFile = process.argv[2] || '../../migrations/21_fix_realtime_broadcast.sql';
        const sqlPath = path.resolve(__dirname, migrationFile);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing migration from: ${sqlPath}`);
        await client.query(sql);
        console.log('✅ Migration executed successfully.');

    } catch (err: any) {
        console.error('❌ Migration execution failed:', err.message || err);
        process.exit(1);
    } finally {
        await client.end();
    }
};

run();
