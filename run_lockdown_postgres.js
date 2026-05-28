const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, 'backend', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Use connection string as is
const directUrl = envConfig.DATABASE_URL;

const sql = postgres(directUrl, {
  ssl: { rejectUnauthorized: false },
  max: 1 // Single connection for migration
});

async function runMigration() {
  try {
    console.log("Starting Emergency Lockdown Migration...");
    const scriptPath = path.join(__dirname, 'frontend', 'database', '29_emergency_security_lockdown.sql');
    const sqlContent = fs.readFileSync(scriptPath, 'utf8');
    
    await sql.unsafe(sqlContent);
    console.log("✅ Emergency Lockdown completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await sql.end();
  }
}

runMigration();
