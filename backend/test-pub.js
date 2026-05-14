const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl'
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
