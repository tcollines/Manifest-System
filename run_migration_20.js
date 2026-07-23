const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const connectionStrings = [
  'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
  'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
];

async function runMigration() {
  const scriptPath = path.join(__dirname, 'backend', 'migrations', '20_realtime_broadcast_triggers.sql');
  const sqlContent = fs.readFileSync(scriptPath, 'utf8');

  for (const connStr of connectionStrings) {
    console.log(`Connecting to ${connStr.replace(/:[^:@]+@/, ':****@')}...`);
    const sql = postgres(connStr, { ssl: { rejectUnauthorized: false }, max: 1, connect_timeout: 10 });
    try {
      await sql.unsafe(sqlContent);
      console.log("✅ Migration 20 (Broadcast Triggers & RPC) completed successfully!");
      await sql.end();
      return;
    } catch (err) {
      console.error("Attempt failed:", err.message || err);
      try { await sql.end(); } catch (e) {}
    }
  }

  console.error("❌ All database migration connection attempts failed.");
}

runMigration();
