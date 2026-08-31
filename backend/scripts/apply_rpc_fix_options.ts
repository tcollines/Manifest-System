import * as dotenv from 'dotenv';
dotenv.config();

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function applyFix() {
    console.log('--- APPLYING RPC FIX (PG OPTIONS) ---');

    const client = new Client({
        user: 'postgres.poazorjmzswectxvakzl',
        host: 'aws-0-us-east-1.pooler.supabase.com',
        database: 'postgres',
        password: 'ujrRGd5IZIKOE9Oj',
        port: 6543,
        ssl: {
            rejectUnauthorized: false
        },
        connectionTimeoutMillis: 10000,
        // The project ID must be passed if using the Supabase pooler
        // Some drivers use 'options' for this
    });

    // Manually add the project ID to the query parameters if using connectionString
    const connectionString = process.env.DATABASE_URL;

    const client2 = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    const sqlPath = path.resolve(__dirname, '../database/60_prod_rpc_fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        await client2.connect();
        console.log("Connected. Executing SQL...");
        await client2.query(sql);
        console.log("SUCCESS: applied!");
    } catch (error: any) {
        console.error("ERROR:", error.message);
    } finally {
        await client2.end();
    }
}

applyFix();
