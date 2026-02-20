import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const poolerUrl = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl";
const client = new Client({
    connectionString: poolerUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    const sql = fs.readFileSync(path.join(__dirname, '../database/74_manifest_performance_indexes.sql'), 'utf-8');
    await client.query(sql);
    console.log('SQL executed successfully');
    await client.end();
}
run().catch(console.error);
