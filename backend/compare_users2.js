require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function compareUsers() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // aine is successful, Ebuflavia is crashing the JWT hook.
    // Also wilberforce is crashing, tl is invalid login.
    const usernames = ['aine', 'Ebuflavia', 'Wilberforce', 'tumweabra', 'tl@entebbemanifest.com'];

    const { data } = await supabaseService.from('users').select('id, username, email, password, role, department_id, manifest_id, status').in('username', usernames);
    fs.writeFileSync('users_comparison.json', JSON.stringify(data, null, 2));
    console.log("Wrote users_comparison.json");
}

compareUsers().catch(console.error);
