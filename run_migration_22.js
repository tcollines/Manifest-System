const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL missing from backend/.env");
  process.exit(1);
}

// Ensure options=project=poazorjmzswectxvakzl is present if pooler host
if (dbUrl.includes('pooler.supabase.com') && !dbUrl.includes('options=')) {
  dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'options=project%3Dpoazorjmzswectxvakzl';
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log("Starting Migration 22 with connection string:", dbUrl.split('@')[1]);
    await client.connect();
    const scriptPath = path.join(__dirname, 'backend', 'migrations', '22_fix_registration_realtime_consistency.sql');
    const sqlContent = fs.readFileSync(scriptPath, 'utf8');
    
    await client.query(sqlContent);
    console.log("✅ Migration 22 successfully applied!");
  } catch (err) {
    console.error("❌ Migration 22 failed:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
