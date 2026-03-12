const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the backend .env file
const envPath = path.join(__dirname, 'backend', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Critical fix: replace %3D with = so options parser understands project=...
const connectionString = envConfig.DATABASE_URL.replace(/%3D/g, '=');

async function run() {
  const sqlPath = path.join(__dirname, 'backend', 'database', '88_allow_first_timer_correction.sql');
  const sqlString = fs.readFileSync(sqlPath, 'utf8');

  console.log("Connecting database via postgres.js with decoded query parameters...", connectionString.replace(/:\w+@/, ':***@'));
  
  const sql = postgres(connectionString, { ssl: 'require' });

  try {
    console.log("Running migration...");
    await sql.unsafe(sqlString);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
