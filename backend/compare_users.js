require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function compareUsers() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // aine is successful, Ebuflavia is crashing the JWT hook.
    // Also wilberforce is crashing, tl is invalid login.
    const usernames = ['aine', 'Ebuflavia', 'Wilberforce', 'tumweabra'];

    const { data } = await supabaseService.from('users').select('*').in('username', usernames);
    console.log(JSON.stringify(data, null, 2));
}

compareUsers().catch(console.error);
