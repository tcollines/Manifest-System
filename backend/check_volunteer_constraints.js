require('dotenv').config();
const { Client } = require('pg');
async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'volunteer_attendance'::regclass;
  `);
    console.table(res.rows);
    await client.end();
}
run().catch(console.error);
