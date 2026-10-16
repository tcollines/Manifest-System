import { resolve as resolveEnvPath } from 'path';

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load Env
const envPath = resolveEnvPath(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase transaction pooler usually, or direct
});

async function runAudit() {
    try {
        await client.connect();
        console.log('Connected to Postgres!');

        // 1. Get Event ID
        const resEvent = await client.query(`SELECT id FROM ministry_events WHERE type = 'Service' ORDER BY date DESC LIMIT 1`);
        const eventId = resEvent.rows[0]?.id;
        console.log('Test Event ID:', eventId);

        if (!eventId) return;

        // 2. Member Search Analysis
        console.log('\n--- Member Search Analysis ---');
        const qWildcard = `EXPLAIN ANALYZE SELECT * FROM members WHERE name ILIKE '%Abraham%'`;
        const resWild = await client.query(qWildcard);
        console.log('Wildcard Search Plan:', resWild.rows.map(r => r['QUERY PLAN']).filter(l => l.includes('Seq Scan') || l.includes('Index Scan') || l.includes('Execution Time')));

        const qPrefix = `EXPLAIN ANALYZE SELECT * FROM members WHERE name ILIKE 'Abraham%'`;
        const resPrefix = await client.query(qPrefix);
        console.log('Prefix Search Plan:', resPrefix.rows.map(r => r['QUERY PLAN']).filter(l => l.includes('Seq Scan') || l.includes('Index Scan') || l.includes('Execution Time')));

        // 3. Text Cast Analysis (simulating get_event_highlights issue)
        console.log('\n--- Text Cast Analysis (Service Attendance) ---');
        // CAST ISSUE
        const qCast = `EXPLAIN ANALYZE SELECT * FROM service_attendance WHERE service_id::text = '${eventId}'`;
        const resCast = await client.query(qCast);
        console.log('Cast to Text Plan:', resCast.rows.map(r => r['QUERY PLAN']).filter(l => l.includes('Seq Scan') || l.includes('Index Scan') || l.includes('Execution Time')));

        // CORRECT UUID
        const qUuid = `EXPLAIN ANALYZE SELECT * FROM service_attendance WHERE service_id = '${eventId}'`;
        const resUuid = await client.query(qUuid);
        console.log('Correct UUID Plan:', resUuid.rows.map(r => r['QUERY PLAN']).filter(l => l.includes('Seq Scan') || l.includes('Index Scan') || l.includes('Execution Time')));

        // 4. Index Check
        console.log('\n--- Index Check ---');
        const resInd = await client.query(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`);
        resInd.rows.forEach(row => {
            if (row.tablename === 'service_attendance' || row.tablename === 'pickup_stations') {
                console.log(`${row.tablename}: ${row.indexname}`);
            }
        });

        // 5. Table Counts
        console.log('\n--- Table Counts ---');
        const resCount = await client.query(`SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC`);
        resCount.rows.forEach(r => console.log(`${r.relname}: ${r.n_live_tup}`));

    } catch (err) {
        console.error('PG Audit Error:', err);
    } finally {
        await client.end();
    }
}

runAudit();
