const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function runMigration() {
  try {
    console.log("Starting Migrations 23 and 24 using postgres.js...");
    
    const scriptPath23 = path.join(__dirname, 'frontend', 'database', '23_add_sales_module.sql');
    const sqlContent23 = fs.readFileSync(scriptPath23, 'utf8');
    await sql.unsafe(sqlContent23);
    console.log("Migration 23 completed successfully!");

    const scriptPath24 = path.join(__dirname, 'frontend', 'database', '24_insert_sales_department.sql');
    const sqlContent24 = fs.readFileSync(scriptPath24, 'utf8');
    await sql.unsafe(sqlContent24);
    console.log("Migration 24 completed successfully!");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

runMigration();
