
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    // Try both pooler and a variations
    const urls = [
        process.env.DATABASE_URL,
        process.env.DATABASE_URL.replace('%3D', '='),
        process.env.DATABASE_URL.replace('6543', '5432'),
        process.env.DATABASE_URL
    ];

    for (const connectionString of urls) {
        console.log(`\nTesting connection to: ${connectionString.split('@')[1]}`);
        const client = new Client({
            connectionString,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log("✅ Connected!");

            const core_tables = [
                'users', 'members'
            ];

            for (const table of core_tables) {
                console.log(`Updating RLS for ${table}...`);
                await client.query(`DROP POLICY IF EXISTS "Tenant Isolation" ON public.${table};`);
                await client.query(`
                    CREATE POLICY "Tenant Isolation" ON public.${table}
                    FOR ALL
                    USING (manifest_id = (auth.jwt() -> 'app_metadata' ->> 'manifest_id')::uuid);
                `);
            }
            console.log("✅ Fix applied to core tables. Exiting loop.");
            await client.end();
            return;
        } catch (err) {
            console.error("❌ Error:", err.message);
        } finally {
            try { await client.end(); } catch (e) { }
        }
    }
}

run();
