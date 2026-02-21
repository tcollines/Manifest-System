const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function analyze() {
  const client = await pool.connect();
  try {
    const { rows: events } = await client.query("SELECT id, manifest_id, legacy_id FROM ministry_events WHERE title = 'MEN GATHER IX' LIMIT 1");
    if (events.length === 0) {
      console.log("Event not found");
      return;
    }

    const eventId = events[0].id;
    const manifestId = events[0].manifest_id;
    const legacyId = events[0].legacy_id;

    await client.query("BEGIN");
    // VERY IMPORTANT: Set the tenant session variable exactly as Supabase uses it
    await client.query("SET LOCAL app.settings.tenant_id = $1", [manifestId]);

    const vehicleQuery = `
      EXPLAIN ANALYZE 
      SELECT * FROM "vehicles" 
      WHERE "manifest_id" = $1 
      AND (
         "event_id" = $2 OR 
         "legacy_event_id" = $3
      )
    `;

    console.log('\n--- VEHICLES QUERY EXECUTION PLAN ---');
    const { rows: vehiclePlan } = await client.query(vehicleQuery, [manifestId, eventId, legacyId || eventId]);
    vehiclePlan.forEach(row => console.log(row['QUERY PLAN']));

    const passQuery = `
      EXPLAIN ANALYZE 
      SELECT * FROM "passengers" 
      WHERE "manifest_id" = $1 
      AND (
         "event_id" = $2 OR 
         "legacy_event_id" = $3
      )
    `;

    console.log('\n--- PASSENGERS QUERY EXECUTION PLAN ---');
    const { rows: passPlan } = await client.query(passQuery, [manifestId, eventId, legacyId || eventId]);
    passPlan.forEach(row => console.log(row['QUERY PLAN']));

    const indexQuery = `
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('vehicles', 'passengers')
    `;
    console.log('\n--- INDEXES ---');
    const { rows: indexes } = await client.query(indexQuery);
    indexes.forEach(idx => console.log(`TABLE: ${idx.tablename} | INDEX: ${idx.indexname} | DEF: ${idx.indexdef}`));

    await client.query("COMMIT");
  } catch (err) {
    console.error('Error:', err);
    await client.query("ROLLBACK");
  } finally {
    client.release();
    pool.end();
  }
}

analyze();
