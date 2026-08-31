require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  
  const { rows } = await client.query(`
    SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  `);
  
  console.log("Realtime tables:");
  console.log(rows.map(r => r.tablename));
  
  await client.end();
}

run().catch(console.error);
