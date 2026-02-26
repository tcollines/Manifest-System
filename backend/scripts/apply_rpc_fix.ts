
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function applyFix() {
    console.log('--- APPLYING RPC FIX VIA PG ---');
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("Missing DATABASE_URL in .env");
        process.exit(1);
    }

    const sqlPath = path.resolve(__dirname, '../database/60_prod_rpc_fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log("Connected to Database. Executing SQL...");
        await client.query(sql);
        console.log("SUCCESS: 60_prod_rpc_fix.sql applied successfully!");
    } catch (error: any) {
        console.error("ERROR applying fix:", error.message || error);
        if (error.detail) console.error("Detail:", error.detail);
        if (error.hint) console.error("Hint:", error.hint);
    } finally {
        await client.end();
    }
}

applyFix();
