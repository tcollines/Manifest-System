const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function forceSync() {
    const email = 'abratumwe@gmail.com';
    const newId = '55bbc8c5-ee4b-4869-8b83-5116e987145c';
    console.log(`--- Forcing Sync for ${email} to ID ${newId} ---`);

    // 1. Fetch current data
    const { data: current, error: getErr } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (!current) {
        console.error("User not found by email in public.users");
        return;
    }
    console.log("Current data:", current);

    // 2. Delete old row
    console.log(`Deleting old row with ID ${current.id}...`);
    const { error: delErr } = await supabase.from('users').delete().eq('id', current.id);
    if (delErr) {
        console.error("Delete failed:", delErr.message);
        return;
    }

    // 3. Insert new row with same data but new ID
    console.log("Inserting new row with new ID...");
    const newUser = { ...current, id: newId };
    const { error: insErr } = await supabase.from('users').insert([newUser]);
    if (insErr) {
        console.error("Insert failed:", insErr.message);
        // Try to restore old user if insert failed?
        await supabase.from('users').insert([current]);
        return;
    }

    console.log("FORCE SYNC SUCCESSFUL!");
}

forceSync();
