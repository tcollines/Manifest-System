require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkIanCherry() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, username, event_id, role')
        .or('name.ilike.%Ian%,name.ilike.%Cherry%,username.ilike.%Ian%,username.ilike.%Cherry%');
        
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }
    
    console.log("Found users:");
    for (const u of users) {
        console.log(`- Name: ${u.name} | Username: ${u.username} | EventID: ${u.event_id} | Role: ${u.role}`);
    }
}

checkIanCherry();
