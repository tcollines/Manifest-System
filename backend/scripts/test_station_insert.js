
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
    const dummyId = uuidv4();
    const payload = {
        id: dummyId,
        name: 'Test Station Insert',
        category: 'Member',
        station_id: '00000000-0000-0000-0000-000000000000' // valid UUID format but likely FK fail
    };

    console.log("Attempting insert with station_id...");
    const { error } = await supabase.from('passengers').insert([payload]);

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert initiated (might have succeeded or failed silently if RLS, but we are service role).");
        // Clean up
        await supabase.from('passengers').delete().eq('id', dummyId);
    }
}

testInsert();
