const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
    try {
        const { rows } = await pool.query(`SELECT proname, prosrc FROM pg_proc WHERE prosrc ILIKE '%Tenant or user not defined%';`);
        console.log(rows[0].prosrc);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
check();
