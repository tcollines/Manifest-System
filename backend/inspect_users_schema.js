require('dotenv').config();
const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query(`
    SELECT 
      column_name, 
      is_nullable, 
      column_default 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND table_schema = 'public';
  `);
    console.table(res.rows);
    await client.end();
}
run().catch(console.error);
