const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();

    console.log("--- INDEXES ---");
    const res = await client.query(`
    SELECT tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN ('attendees', 'finance_transactions', 'vehicles', 'personal_vehicles', 'children', 'next_gen_souls', 'requisitions', 'service_attendance');
  `);
    console.log(JSON.stringify(res.rows, null, 2));

    console.log("--- EXPLAIN ANALYZE ---");
    const queries = [
        `EXPLAIN ANALYZE SELECT * FROM service_attendance WHERE service_id = '00000000-0000-0000-0000-000000000000'`,
        `EXPLAIN ANALYZE SELECT * FROM finance_transactions WHERE event_id = '00000000-0000-0000-0000-000000000000'`,
        `EXPLAIN ANALYZE SELECT * FROM vehicles WHERE event_id = '00000000-0000-0000-0000-000000000000'`,
        `EXPLAIN ANALYZE SELECT * FROM personal_vehicles WHERE current_service_id = '00000000-0000-0000-0000-000000000000'`,
        `EXPLAIN ANALYZE SELECT * FROM requisitions WHERE event_id = '00000000-0000-0000-0000-000000000000'`,
        `EXPLAIN ANALYZE SELECT * FROM children WHERE parent_id = '00000000-0000-0000-0000-000000000000'`,
        `EXPLAIN ANALYZE SELECT * FROM pickup_stations WHERE event_id = '00000000-0000-0000-0000-000000000000'`
    ];

    for (const q of queries) {
        console.log("Query:", q);
        try {
            const explain = await client.query(q);
            console.log(explain.rows.map(r => r['QUERY PLAN']).join('\\n'));
        } catch (e) {
            console.error(e.message);
        }
        console.log("-----------------------");
    }

    await client.end();
}

run();
