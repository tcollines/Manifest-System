require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const rawUrl = process.env.DATABASE_URL;
    // postgres://postgres.poazorjmzswectxvakzl:***@aws-0-us-east-1.pooler.supabase.com...
    // The raw URL already contains the project ref if it's new-style: postgres.projectRef
    // Wait, let's parse it and ensure the username is correct if using pooler.

    let connectionString = rawUrl;
    if (rawUrl.includes('pooler.supabase.com') && rawUrl.includes('?options=')) {
        // If it has ?options=project%3Dxyz, let's extract xyz and append to username if missing
        const userMatch = rawUrl.match(/postgres:\/\/([^:]+):/);
        const optionsMatch = rawUrl.match(/options=project%3D([^&]+)/);

        if (userMatch && optionsMatch) {
            const username = userMatch[1];
            const projectId = optionsMatch[1];
            if (!username.includes('.')) {
                connectionString = rawUrl.replace(`postgres://${username}:`, `postgres://${username}.${projectId}:`);
            }
        }
    }

    console.log('Using connection string format:', connectionString.replace(/:([^:@]+)@/, ':***@'));

    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected correctly!');

        const query = `
      DROP TRIGGER IF EXISTS trg_sync_children_ids ON public.children;
      DROP FUNCTION IF EXISTS sync_children_ids();
      
      -- Also dropping the incident trigger just in case child_id_uuid causes issues 
      -- Wait, child_id_uuid was dropped? No, phase 3c hardened uuid. So id is the primary key.
      -- Let's stick to the immediate crashing one.
    `;
        const res = await client.query(query);
        console.log('Trigger dropped:', res);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}
run();
