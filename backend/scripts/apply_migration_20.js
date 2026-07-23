const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const sqlPath = path.join(__dirname, '../migrations/20_realtime_broadcast_triggers.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log("Applying Migration 20 via Supabase RPC...");
  try {
    const { data, error } = await supabase.rpc('run_sql', { sql });
    if (error) {
      console.warn("RPC run_sql notice:", error.message);
      // Fallback: splitting statements and running RPC statements
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        const { error: stmtError } = await supabase.rpc('run_sql', { sql: stmt });
        if (stmtError) {
          console.error("Statement error:", stmtError.message, "\nStatement:", stmt.slice(0, 50));
        }
      }
    } else {
      console.log("✅ Migration 20 applied successfully via Supabase RPC!");
      return;
    }
  } catch (err) {
    console.error("RPC execution error:", err);
  }

  // Fallback 2: PG client with parsed direct URL
  const { Client } = require('pg');
  let connectionString = process.env.DATABASE_URL;
  if (connectionString && connectionString.includes('pooler.supabase.com')) {
    const projectIdMatch = connectionString.match(/project%3D([a-z0-9]+)/);
    const passwordMatch = connectionString.match(/:([^:]+)@aws-/);
    if (projectIdMatch && passwordMatch) {
      connectionString = `postgres://postgres:${passwordMatch[1]}@db.${projectIdMatch[1]}.supabase.co:5432/postgres`;
    }
  }

  if (connectionString) {
    console.log("Applying Migration 20 via Direct PG Client...");
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      console.log("✅ Migration 20 applied successfully via Direct PG Client!");
    } catch (pgErr) {
      console.error("❌ Direct PG Client error:", pgErr.message);
    } finally {
      await client.end();
    }
  }
}

run();
