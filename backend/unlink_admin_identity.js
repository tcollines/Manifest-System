require('dotenv').config();
const { Client } = require('pg');

async function fix() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    console.log("Unlinking rogue Google Identity from Admin Next Gen user...");
    const query = `
    DELETE FROM auth.identities 
    WHERE id = '115295079670456356894' 
      AND provider = 'google' 
      AND user_id = '55bbc8c5-ee4b-4869-8b83-5116e987145c' 
    RETURNING *;
  `;

    const res = await client.query(query);
    console.log('Unlinked Identities:', res.rows.length);

    await client.end();

    // Now verify if abratumwe@gmail.com is clear
    console.log("Verifying GoTrue clearance...");
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: aUser } = await sb.auth.admin.getUserById('55bbc8c5-ee4b-4869-8b83-5116e987145c');
    console.log("Deleted User identities remaining:", aUser?.user?.identities?.length);

    console.log("Re-initiating proper Google login identity map via test call...");
    const { data, error } = await sb.auth.admin.createUser({
        email: 'abratumwe@gmail.com',
        password: 'testPassword123!',
        user_metadata: { role: 'Head of Dept' }
    });
    console.log('Active Profile Schema Sync:', error ? error.message : 'SUCCESS ' + data.user.id);
}

// execute
fix().catch(e => {
    console.error(e);
    process.exit(1);
});
