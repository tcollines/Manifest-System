
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("No DATABASE_URL found.");
        process.exit(1);
    }
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Adding station_id column...");
        await client.query(`
            ALTER TABLE passengers 
            ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES pickup_stations(id);
        `);
        console.log("Adding legacy_station_id column...");
        await client.query(`
            ALTER TABLE passengers 
            ADD COLUMN IF NOT EXISTS legacy_station_id TEXT;
        `);
        console.log("Creating index...");
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_passengers_station_id ON passengers(station_id);
        `);
        console.log("Migration executed successfully.");
    } catch (err: any) {
        console.error("Migration failed:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } finally {
        await client.end();
    }
}
run();
