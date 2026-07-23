const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  const { rows } = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'service_attendance';
  `);
  
  console.log("Policies for service_attendance:");
  console.table(rows);
  
  await client.end();
}

run().catch(console.error);
