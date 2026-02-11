import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function executeSqlFile(filePath: string) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ DATABASE_URL not found in .env");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`Connected to database (DIRECT IP). Executing ${filePath}...`);

        const sql = fs.readFileSync(filePath, 'utf8');
        const res = await client.query(sql);
        if (res.rows) {
            console.log('Rows:', res.rows);
        }
        console.log('✅ SQL Execution successful.');
    } catch (err) {
        console.error('❌ Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

const sqlFile = process.argv[2];
if (!sqlFile) {
    console.error('Please provide a SQL file path.');
} else {
    executeSqlFile(path.resolve(__dirname, '..', sqlFile));
}
