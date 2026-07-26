const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const project = 'poazorjmzswectxvakzl';
const pass = 'ujrRGd5IZIKOE9Oj';
const sqlPath = path.join(__dirname, 'backend', 'migrations', '23_fix_custom_access_token_hook.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

const connectionAttempts = [
  process.env.DATABASE_URL,
  `postgres://postgres.${project}:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3D${project}`,
  `postgres://postgres.${project}:${pass}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?options=project%3D${project}`,
  `postgres://postgres:${pass}@db.${project}.supabase.co:5432/postgres`,
  `postgres://postgres:${pass}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
];

async function run() {
  for (const connStr of connectionAttempts) {
    if (!connStr) continue;
    console.log("Attempting PG connection to:", connStr.replace(pass, '****').split('@')[1] || connStr);
    const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
    try {
      await client.connect();
      await client.query(sqlContent);
      console.log("🎉 SUCCESS: Migration 23 applied successfully via PostgreSQL client!");
      await client.end();
      return;
    } catch (err) {
      console.log("Connection attempt failed:", err.message);
    }
  }

  console.log("\n==========================================================================");
  console.log("📌 ACTION REQUIRED: RUN THE SQL BELOW IN SUPABASE SQL EDITOR");
  console.log("==========================================================================\n");
  console.log(sqlContent);
}

run();
