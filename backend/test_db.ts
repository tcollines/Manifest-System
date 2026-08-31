import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const poolUrl = process.env.DATABASE_URL || '';
const match = poolUrl.match(/:([^:@]+)@/);
const password = match ? match[1] : '';
const directUrl = process.env.DATABASE_URL;

async function test() {
    const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const result = await client.query("SELECT id, first_name, source_type, event_id FROM souls ORDER BY created_at DESC LIMIT 10");
    console.log("Recent Souls:", result.rows);
    await client.end();
}
test().catch(console.error);
