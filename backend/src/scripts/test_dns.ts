import { Client } from 'pg';

async function testConnection() {
    const connectionString = 'postgres://postgres:ujrRGd5IZIKOE9Oj@52.45.94.125:6543/postgres?options=project%3Dpoazorjmzswectxvakzl';
    console.log("Connecting using project option to 52.45.94.125...");
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false, servername: 'aws-0-us-east-1.pooler.supabase.com' }
    });

    try {
        await client.connect();
        console.log("🎉 CONNECTED SUCCESSFULLY TO SUPABASE POSTGRES VIA POOLER!");
        const res = await client.query("SELECT version();");
        console.log("PostgreSQL Version:", res.rows[0]);

        const fs = require('fs');
        const path = require('path');
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

testConnection();
