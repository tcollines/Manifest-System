const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
    try {
        const { rows } = await pool.query(`
      SELECT pg_get_triggerdef(t.oid) AS ddl
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'vehicles';
    `);
        console.log("Triggers on vehicles table:");
        rows.forEach(r => console.log(r.ddl));

        // Check functions that check tenant
        const { rows: funcs } = await pool.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE prosrc ILIKE '%Tenant or user not defined%';
    `);
        console.log("\nFunctions throwing the error:");
        funcs.forEach(f => console.log(f.proname, ":", f.prosrc.substring(0, 100)));

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
