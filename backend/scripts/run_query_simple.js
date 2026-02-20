
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function run() {
    // Using Session Pooler (Standard Port 5432) on the existing pooler hostname
    const connectionString = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:5432/postgres?options=project%3Dpoazorjmzswectxvakzl";

    console.log("Attempting Connection to Session Pooler...");

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to DB (Session).");

        const core_tables = [
            'users', 'members', 'children', 'ministry_events', 'pickup_stations',
            'vehicles', 'passengers', 'souls', 'service_attendance', 'volunteer_attendance',
            'incidents', 'personal_vehicles', 'department_requests', 'report_submissions',
            'requisitions', 'assets', 'transactions', 'monitoring_reports', 'healing_reports',
            'school_outreach_reports', 'next_gen_souls'
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

        console.log("✅ All RLS Policies aligned with JWT app_metadata.");
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
