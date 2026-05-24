import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: 'backend/.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if(!connectionString) throw new Error("No URL");
  const client = new pg.Pool({ connectionString });
  
  console.log("Starting Migrations 23 and 24 using pg.Pool...");

  const __dirname = path.resolve();

  try {
    const sqlContent23 = fs.readFileSync(path.join(__dirname, 'frontend', 'database', '23_add_sales_module.sql'), 'utf8');
    await client.query(sqlContent23);
    console.log("Migration 23 completed successfully!");

    const sqlContent24 = fs.readFileSync(path.join(__dirname, 'frontend', 'database', '24_insert_sales_department.sql'), 'utf8');
    await client.query(sqlContent24);
    console.log("Migration 24 completed successfully!");
  } catch (e) {
    console.error("Migration failed:", e);
  }

  await client.end();
}

run();
