import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const poolUrl = process.env.DATABASE_URL || '';
const match = poolUrl.match(/:([^:@]+)@/);
const password = match ? match[1] : '';
const directUrl = `postgres://postgres.poazorjmzswectxvakzl:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl`;

async function test() {
    const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const result = await client.query("SELECT id, first_name, source_type, event_id FROM souls ORDER BY created_at DESC LIMIT 10");
    console.log("Recent Souls:", result.rows);
    await client.end();
}
test().catch(console.error);
