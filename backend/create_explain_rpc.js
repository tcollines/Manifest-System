// Create a migration file to add an RPC that lets me run explain analyze.
// Actually I can just create the target get_finance_event_summary RPC and explain analyze that!
// Wait, the prompt says "Extract the exact transaction query currently used for KPI calculation. Run: EXPLAIN ANALYZE <current_query>;"
// Then "Provide: Execution time, Rows scanned, Index usage, Whether sequential scan occurs".

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const dbUrl = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:5432/postgres";
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
    const client = await pool.connect();
    try {
        const { rows: events } = await client.query("SELECT id, manifest_id FROM ministry_events WHERE title = 'MEN GATHER IX' LIMIT 1");
        if (events.length === 0) return console.log('no event');
        const mId = events[0].manifest_id;
        const eId = events[0].id;

        await client.query("BEGIN;");
        // IMPORTANT: Let's create an RPC that runs the explain!
        await client.query(`
            CREATE OR REPLACE FUNCTION run_explain_analyze(q text) RETURNS json AS $$
            DECLARE
                res json;
            BEGIN
                EXECUTE 'EXPLAIN (ANALYZE, FORMAT JSON) ' || q INTO res;
                RETURN res;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log("Created RPC run_explain_analyze.");
        await client.query("COMMIT;");
    } catch (e) {
        console.error(e);
        await client.query("ROLLBACK;");
    } finally {
        client.release();
        pool.end();
    }
}
run();
