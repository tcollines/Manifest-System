require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkPasswords() {
    const { data: users, error } = await supabase.from('users').select('id, name, password').limit(50);
    console.log("Sample of passwords:", users.map(u => u.password).slice(0, 20));
}

checkPasswords();
