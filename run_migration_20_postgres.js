const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, 'backend', '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Supavisor connection string without the options query string, since username already has the tenant id
const directUrl = 'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const client = new Client({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log("Starting Migration 20...");
    await client.connect();
    
    const scriptPath = path.join(__dirname, 'frontend', 'database', '20_add_departmental_roles.sql');
    const sqlContent = fs.readFileSync(scriptPath, 'utf8');
    
    await client.query(sqlContent);
    console.log("Migration 20 completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
