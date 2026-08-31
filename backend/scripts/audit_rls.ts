import * as dotenv from 'dotenv';
dotenv.config();

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkRLS() {
    // Direct connection (Session mode)
    const connectionString = process.env.DATABASE_URL;

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('--- Checking RLS Policies ---');

        const query = `
            SELECT schemaname, tablename, policyname, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename IN ('ministry_events', 'members', 'children', 'souls', 'next_gen_souls');
        `;

        const res = await client.query(query);
        res.rows.forEach(r => {
            console.log(`[${r.tablename}] ${r.policyname} (${r.cmd}):`);
            console.log(`  USING: ${r.qual}`);
            console.log(`  WITH CHECK: ${r.with_check}`);
            console.log('---');
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkRLS();
