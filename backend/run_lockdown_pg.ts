const pg = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

async function run() {
  let connectionString = process.env.DATABASE_URL;
  if(!connectionString) throw new Error("No DATABASE_URL in .env");
  
  if (connectionString.includes('6543')) {
      connectionString = connectionString.replace(':6543/postgres?options=project%3Dpoazorjmzswectxvakzl', ':5432/postgres');
  }
  
  const client = new pg.Pool({ connectionString });
  
  try {
    const sqlPath = path.join(__dirname, '../frontend/database/29_emergency_security_lockdown.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Executing emergency lockdown migration directly via pg (direct connect)...");
    await client.query(sql);
    console.log("✅ Lockdown executed successfully!");
  } catch (e) {
    console.error("Migration Failed:", e);
  } finally {
    await client.end();
  }
}

run();
