require('dotenv').config();
const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query(`
    SELECT 
      trigger_name, 
      event_manipulation, 
      event_object_table, 
      action_statement 
    FROM information_schema.triggers 
    WHERE event_object_table = 'users' 
    AND event_object_schema = 'auth';
  `);
    console.table(res.rows);
    await client.end();
}
run().catch(console.error);
