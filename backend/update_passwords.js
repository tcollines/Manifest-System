require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function updatePasswords() {
    console.log("Updating NULL passwords to '123' in public.users...");
    
    // Using Supabase API to update
    const { data, error } = await supabase
        .from('users')
        .update({ password: '123' })
        .is('password', null)
        .select('id, name, username, role');
        
    if (error) {
        console.error("Error updating passwords:", error);
    } else {
        console.log(`Successfully updated ${data.length} users' passwords to '123'.`);
    }
}

updatePasswords();
