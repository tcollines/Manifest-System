import { config as loadEnv } from 'dotenv';
import { resolve as resolveEnvPath } from 'path';
loadEnv({ path: resolveEnvPath(__dirname, '../../.env') });
import { Client } from 'pg';

const candidateHosts = [
    'poazorjmzswectxvakzl.supabase.co',
    'db.poazorjmzswectxvakzl.supabase.co',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-eu-central-1.pooler.supabase.com'
];

async function run() {
    for (const host of candidateHosts) {
        for (const port of [5432, 6543]) {
            for (const user of ['postgres', 'postgres.poazorjmzswectxvakzl']) {
                console.log(`Connecting to ${host}:${port} as ${user}...`);
                const client = new Client({
                    host,
                    port,
                    user,
                    password: process.env.SUPABASE_DB_PASSWORD,
                    database: 'postgres',
                    ssl: { rejectUnauthorized: false }
                });
                try {
                    await client.connect();
                    console.log(`🎉 SUCCESS! Connected to ${host}:${port} as ${user}`);
                    
                    const fs = require('fs');
                    const path = require('path');
                    const sqlPath = path.resolve(__dirname, '../../migrations/20_realtime_broadcast_triggers.sql');
                    const sql = fs.readFileSync(sqlPath, 'utf8');

                    console.log("Executing Migration 20...");
                    await client.query(sql);
                    console.log("✅ Migration 20 executed successfully!");
                    await client.end();
                    return;
                } catch (e: any) {
                    console.log(`Failed (${e.message})`);
                    try { await client.end(); } catch (resErr) {}
                }
            }
        }
    }
}

run();
