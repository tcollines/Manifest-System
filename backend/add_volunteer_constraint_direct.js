require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const poolerUrl = process.env.DATABASE_URL;
    const match = poolerUrl.match(/postgres\.(.*?):(.*?)@.*\.pooler\.supabase\.com/);
    if (!match) throw new Error('Could not parse project ref');

    const projectRef = match[1];
    const password = match[2];

    const directUrl = `postgres://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
    console.log('Connecting to direct URL on port 5432...');

    const client = new Client({ connectionString: directUrl });
    try {
        await client.connect();
        console.log('Connected! Creating constraint...');
        const res = await client.query(`
      ALTER TABLE public.volunteer_attendance
      ADD CONSTRAINT unique_volunteer_service UNIQUE (volunteer_id, service_id);
    `);
        console.log('Success:', res.command);
    } catch (e) {
        if (e.code === '42P07') {
            console.log('Constraint already exists. Error:', e.message);
        } else {
            console.error('Error:', e);
        }
    } finally {
        await client.end();
    }
}
run();
