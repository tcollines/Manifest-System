import { resolve as resolveEnvPath } from 'path';

import { Client } from 'pg';
import dotenv from 'dotenv';

const envPath = resolveEnvPath(__dirname, '../../.env');
dotenv.config({ path: envPath });

const run = async () => {
    console.log("Testing connection...");
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ CONNECTED SUCCESSFULLY!");
        await client.end();
    } catch (err) {
        console.error("❌ CONNECTION FAILED:", err);
        process.exit(1);
    }
};

run();
