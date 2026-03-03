require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    console.log('Using URL containing:', url ? url.substring(0, 15) + '...' : 'none');
    const client = new Client({ connectionString: url });

    try {
        await client.connect();
        const res = await client.query(`
      ALTER TABLE public.volunteer_attendance
      ADD CONSTRAINT unique_volunteer_service UNIQUE (volunteer_id, service_id);
    `);
        console.log('Successfully added unique constraint:', res.command);
    } catch (err) {
        if (err.code === '42P07') {
            console.log('Constraint already exists. Error:', err.message);
        } else {
            console.error('Error adding constraint:', err);
        }
    } finally {
        await client.end();
    }
}

run();
