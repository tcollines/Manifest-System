import * as dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function run() {
    const connStr = process.env.DATABASE_URL;
    console.log("Connecting with sslmode=require...");
    const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🎉 CONNECTED TO SUPABASE POSTGRES!");
        const sqlPath = path.resolve(__dirname, '../../migrations/20_realtime_broadcast_triggers.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Executing Migration 20...");
        await client.query(sql);
        console.log("✅ Migration 20 executed successfully!");
    } catch (e: any) {
        console.error("Connection error:", e.message || e);
    } finally {
        await client.end();
    }
}

run();
