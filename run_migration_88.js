const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, 'backend', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Bypass pooler completely and use direct connection string logic
const directUrl = envConfig.DATABASE_URL.replace('6543', '5432').split('?')[0];

const sql = postgres(directUrl, {
  ssl: { rejectUnauthorized: false },
  max: 1 // Single connection for migration
});

async function runMigration() {
  try {
    console.log("Starting Migration 88...");
    const scriptPath = path.join(__dirname, 'backend', 'database', '88_allow_first_timer_correction.sql');
    const sqlContent = fs.readFileSync(scriptPath, 'utf8');
    
    await sql.unsafe(sqlContent);
    console.log("Migration 88 completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

runMigration();
