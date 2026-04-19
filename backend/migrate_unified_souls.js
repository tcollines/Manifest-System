require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.poazorjmzswectxvakzl',
  password: 'ujrRGd5IZIKOE9Oj',
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("Creating unified_souls_won table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS unified_souls_won (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        manifest_id UUID NOT NULL,
        source_category TEXT NOT NULL,
        source_id UUID,
        date_entered TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        soul_count INTEGER DEFAULT 1,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        email TEXT,
        gender TEXT,
        residence TEXT,
        status TEXT DEFAULT 'New',
        notes TEXT,
        captured_by TEXT
      );
    `);

    console.log("Migrating individuals from 'souls' table...");
    await client.query(`
      INSERT INTO unified_souls_won (id, manifest_id, source_category, source_id, date_entered, soul_count, first_name, last_name, phone, email, gender, residence, status, notes, captured_by)
      SELECT id, manifest_id, source_type, source_id, created_at, 1, first_name, last_name, phone, email, gender, residence, status, notes, captured_by
      FROM souls
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log("Migrating NEXT GEN souls...");
    await client.query(`
      INSERT INTO unified_souls_won (id, manifest_id, source_category, source_id, date_entered, soul_count, first_name, last_name, phone, status, notes, captured_by)
      SELECT id, manifest_id, 'NextGen', service_id, created_at, 1, child_name, '', guardian_contact, follow_up_status, follow_up_notes, captured_by
      FROM children
      WHERE category = 'First Timer'
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log("Migrating Passengers (soul_won = true)...");
    await client.query(`
      INSERT INTO unified_souls_won (manifest_id, source_category, source_id, date_entered, soul_count, first_name, phone, residence, status)
      SELECT manifest_id, 'Passenger', event_id, created_at, 1, name, contact, residence, 'New'
      FROM passengers
      WHERE soul_won = true;
    `);

    console.log("Migrating Residence Outreach Reports...");
    await client.query(`
      INSERT INTO unified_souls_won (manifest_id, source_category, source_id, date_entered, soul_count, notes, captured_by)
      SELECT manifest_id, 'Residency Outreach', id, created_at, souls_won, report_text, submitted_by
      FROM residence_outreach_reports
      WHERE souls_won > 0;
    `);

    console.log("Migrating School Outreach Reports...");
    await client.query(`
      INSERT INTO unified_souls_won (manifest_id, source_category, source_id, date_entered, soul_count, notes, captured_by)
      SELECT manifest_id, 'School Outreach', id, created_at, souls_won, report_text, submitted_by
      FROM school_outreach_reports
      WHERE souls_won > 0;
    `);

    console.log("Migrating Campus Activities...");
    await client.query(`
      INSERT INTO unified_souls_won (manifest_id, source_category, source_id, date_entered, soul_count, notes, captured_by)
      SELECT manifest_id, 'Campus Activity', id, created_at, souls_won, description, host_name
      FROM campus_activities
      WHERE souls_won > 0;
    `);

    console.log("Migrating Healing Reports...");
    await client.query(`
      INSERT INTO unified_souls_won (manifest_id, source_category, source_id, date_entered, soul_count, notes, captured_by)
      SELECT manifest_id, 'Healing', id, created_at, souls_count, report_text, submitted_by
      FROM healing_reports
      WHERE souls_count > 0;
    `);

    await client.query('COMMIT');
    console.log("Migration completed successfully!");

  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
