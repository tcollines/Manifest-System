const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
    try {
        const { rows } = await pool.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('vehicles', 'passengers');");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
check();
