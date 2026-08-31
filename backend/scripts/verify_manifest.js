require('dotenv').config();
const { Client } = require('pg');
const directUrl = process.env.DATABASE_URL;
const query = "SELECT t.table_name, c.column_name, c.data_type FROM information_schema.tables t LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.column_name = 'manifest_id' WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE' ORDER BY t.table_name;"

const client = new Client({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(query);
  console.log('TABLE NAME'.padEnd(30, ' ') + ' | MANIFEST_ID TYPE');
  console.log('------------------------------------------------');
  res.rows.forEach(r => {
    console.log(r.table_name.padEnd(30, ' ') + ' | ' + (r.column_name ? r.data_type : 'MISSING'));
  });
  await client.end();
}
run().catch(console.error);
