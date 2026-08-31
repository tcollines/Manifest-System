require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function measureTransactionKPIs() {
    const client = await pool.connect();
    try {
        // 1. Get Event and Manifest ID
        const { rows: events } = await client.query("SELECT id, manifest_id FROM ministry_events WHERE title = 'MEN GATHER IX' LIMIT 1");
        if (events.length === 0) return console.log("Event not found");
        const event = events[0];

        // Simulate what the RPC does by overriding tenant
        await client.query("BEGIN");
        await client.query(`SET LOCAL app.settings.tenant_id = '${event.manifest_id}'`);

        console.log(`Analyzing for Event: ${event.id}, Manifest: ${event.manifest_id}`);

        const query = `
      EXPLAIN ANALYZE 
      SELECT * FROM "transactions" 
      WHERE "manifest_id" = $1 
      AND "event_id" = $2;
    `;

        console.log('\n--- KPI AGGREGATION QUERY ---');
        const { rows: plan } = await client.query(query, [event.manifest_id, event.id]);
        plan.forEach(row => console.log(row['QUERY PLAN']));

        await client.query("COMMIT");
    } catch (err) {
        console.error(err);
        await client.query("ROLLBACK");
    } finally {
        client.release();
        pool.end();
    }
}
measureTransactionKPIs();
