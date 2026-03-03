require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const url = process.env.DATABASE_URL;
    const client = new Client({ connectionString: url });

    try {
        await client.connect();
        const query = `
      SELECT 
        t.tgname AS trigger_name,
        p.proname AS function_name,
        p.prosrc AS function_body
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgrelid = 'public.children'::regclass;
    `;
        const res = await client.query(query);
        res.rows.forEach(r => {
            console.log('--- Trigger:', r.trigger_name, '---');
            console.log('Function:', r.function_name);
            console.log('Body:', r.function_body);
        });
    } catch (e) {
        console.error(e.message);
    } finally {
        await client.end();
    }
}
run();
