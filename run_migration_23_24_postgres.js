const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, 'backend', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const client = new Client({
  connectionString: envConfig.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log("Starting Migrations 23 and 24...");
    await client.connect();
    
    const scriptPath23 = path.join(__dirname, 'frontend', 'database', '23_add_sales_module.sql');
    const sqlContent23 = fs.readFileSync(scriptPath23, 'utf8');
    await client.query(sqlContent23);
    console.log("Migration 23 completed successfully!");

    const scriptPath24 = path.join(__dirname, 'frontend', 'database', '24_insert_sales_department.sql');
    const sqlContent24 = fs.readFileSync(scriptPath24, 'utf8');
    await client.query(sqlContent24);
    console.log("Migration 24 completed successfully!");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
