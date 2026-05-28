import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if(!connectionString) throw new Error("No URL");
  const client = new pg.Pool({ connectionString });
  
  try {
    const res = await client.query(`
      SELECT 
        schemaname, 
        tablename, 
        rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    console.log("=== RLS STATUS ===");
    console.table(res.rows);

    const rlsPolicies = await client.query(`
        SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public';
    `);
    console.log("=== POLICIES COUNT ===", rlsPolicies.rows.length);

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
