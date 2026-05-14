const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl'
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
  
  const { rows: rlsEnabled } = await client.query(`
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE relname = 'service_attendance';
  `);
  console.log("RLS Enabled:", rlsEnabled[0]?.relrowsecurity);
  
  await client.end();
}

run().catch(console.error);
