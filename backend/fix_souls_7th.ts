import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const poolUrl = process.env.DATABASE_URL || '';
const match = poolUrl.match(/:([^:@]+)@/);
const password = match ? match[1] : '';
const directUrl = `postgres://postgres.poazorjmzswectxvakzl:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dpoazorjmzswectxvakzl`;

async function fixSouls() {
    const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        // Find the Men Gather event
        const eventRes = await client.query("SELECT id, title FROM ministry_events WHERE title ILIKE '%Men Gather%' LIMIT 1");
        if (eventRes.rows.length === 0) {
            console.log("Men Gather event not found.");
            return;
        }

        const eventId = eventRes.rows[0].id;
        console.log(`Found event: ${eventRes.rows[0].title} (ID: ${eventId})`);

        // Find souls created on March 7th
        // Supabase stores as timestamptz usually. Let's find dates around March 7th
        const soulsRes = await client.query(`
            SELECT id, first_name, last_name, created_at, source_id, event_id 
            FROM souls 
            WHERE created_at >= '2026-03-07 00:00:00' AND created_at < '2026-03-08 00:00:00'
        `);

        console.log(`Found ${soulsRes.rows.length} souls recorded on the 7th.`);

        // Update them
        if (soulsRes.rows.length > 0) {
            const updateRes = await client.query(`
                UPDATE souls 
                SET event_id = $1, source_id = $1
                WHERE created_at >= '2026-03-07 00:00:00' AND created_at < '2026-03-08 00:00:00'
                RETURNING id
            `, [eventId]);
            console.log(`Successfully updated ${updateRes.rowCount} souls and linked them to Men Gather.`);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

fixSouls();
