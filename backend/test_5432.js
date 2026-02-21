const { Pool } = require('pg');

// Replacing port 6543 with 5432 for direct connection without the pooler
const dbUrl = "postgres://postgres.poazorjmzswectxvakzl:ujrRGd5IZIKOE9Oj@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";

const pool = new Pool({ connectionString: dbUrl });

async function check() {
    try {
        const { rows } = await pool.query(`SELECT 1 as connected;`);
        console.log(rows);

        // Test the transaction query for the KPI baseline!
        const query = `
      EXPLAIN ANALYZE 
      SELECT * FROM "transactions" 
      WHERE "manifest_id" = 'm1' 
      AND "event_id" = 'e1';
    `;
        const { rows: plan } = await pool.query(query);
        console.log("--- EXPLAIN ANALYZE TRANSACTIONS ---");
        plan.forEach(row => console.log(row['QUERY PLAN']));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
check();
