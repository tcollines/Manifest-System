
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function applyFix() {
    console.log('--- APPLYING RPC FIX (RETRY) ---');

    // Direct connection params derived from DATABASE_URL
    const client = new Client({
        host: 'db.poazorjmzswectxvakzl.supabase.co',
        port: 5432,
        user: 'postgres',
        password: 'ujrRGd5IZIKOE9Oj',
        database: 'postgres',
        ssl: {
            rejectUnauthorized: false
        }
    });

    const sqlPath = path.resolve(__dirname, '../database/60_prod_rpc_fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        await client.connect();
        console.log("Connected to Direct DB. Executing SQL...");
        await client.query(sql);
        console.log("SUCCESS: 60_prod_rpc_fix.sql applied!");
    } catch (error: any) {
        console.error("ERROR:", error.message);
        if (error.detail) console.error("Detail:", error.detail);
    } finally {
        await client.end();
    }
}

applyFix();
