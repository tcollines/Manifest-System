import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: 'backend/.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if(!connectionString) throw new Error("No URL");
  const client = new pg.Pool({ connectionString });
  
  const sql = fs.readFileSync('09_performance_indexes.sql', 'utf8');

  await client.query(sql);

  console.log("Migration 09 executed successfully.");
  await client.end();
}

run();
