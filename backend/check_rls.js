const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkRLS() {
    try {
        const { rows } = await pool.query(`
      SELECT cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'vehicles';
    `);
        console.log("RLS Policies for Vehicles:");
        console.log(rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
checkRLS();
