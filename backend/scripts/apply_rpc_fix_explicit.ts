
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function applyFix() {
    console.log('--- APPLYING RPC FIX (EXPLICIT POOLED) ---');

    const client = new Client({
        user: 'postgres.poazorjmzswectxvakzl',
        host: 'aws-0-us-east-1.pooler.supabase.com',
        database: 'postgres',
        password: 'ujrRGd5IZIKOE9Oj',
        port: 6543,
        ssl: {
            rejectUnauthorized: false
        }
    });

    const sqlPath = path.resolve(__dirname, '../database/60_prod_rpc_fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        await client.connect();
        console.log("Connected. Executing SQL...");
        await client.query(sql);
        console.log("SUCCESS: applied!");
    } catch (error: any) {
        console.error("ERROR:", error.message);
    } finally {
        await client.end();
    }
}

applyFix();
