const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL missing from backend/.env");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log("Starting Migration...");
    await client.connect();
    const scriptPath = path.join(__dirname, 'backend', 'migrations', '21_fix_realtime_broadcast.sql');
    const sqlContent = fs.readFileSync(scriptPath, 'utf8');
    
    await client.query(sqlContent);
    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
