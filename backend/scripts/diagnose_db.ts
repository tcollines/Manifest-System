
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Try loading from multiple locations
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log("Checking Environment...");
console.log("DATABASE_URL length:", process.env.DATABASE_URL ? process.env.DATABASE_URL.length : "MISSING");

async function testConnection() {
    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL is missing from process.env");
        return;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Attempting to connect...");
        await client.connect();
        console.log("✅ Connected successfully!");

        const res = await client.query('SELECT NOW() as now');
        console.log("Query Result:", res.rows[0]);

        await client.end();
    } catch (err: any) {
        console.error("❌ Connection Failed:");
        console.error("Message:", err.message);
        console.error("Code:", err.code);
        console.error("Detail:", err);
    }
}

testConnection();
