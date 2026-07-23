const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Try direct DB port 5432 or pooler fallback
const dbUrls = [
  'postgres://postgres:ujrRGd5IZIKOE9Oj@db.poazorjmzswectxvakzl.supabase.co:5432/postgres',
  'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
  process.env.DATABASE_URL
].filter(Boolean);

async function runMigration() {
  let success = false;
  for (const url of dbUrls) {
    console.log(`Trying connection to ${url.replace(/:[^:@]+@/, ':****@')}...`);
    const sql = postgres(url, { ssl: { rejectUnauthorized: false }, max: 1, connect_timeout: 10 });
    try {
      const scriptPath = path.join(__dirname, '..', 'migrations', '20_realtime_broadcast_triggers.sql');
      const sqlContent = fs.readFileSync(scriptPath, 'utf8');
      await sql.unsafe(sqlContent);
      console.log("✅ Migration 20 (Broadcast Triggers & RPC) completed successfully!");
      await sql.end();
      success = true;
      break;
    } catch (err) {
      console.error(`Connection attempt failed:`, err.message || err);
      try { await sql.end(); } catch (e) {}
    }
  }

  if (!success) {
    console.error("❌ All connection attempts failed.");
    process.exit(1);
  }
}

runMigration();
