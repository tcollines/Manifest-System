require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkUsers() {
    console.log("Fetching users matching 'Ian' or 'Cherry'...");
    
    // Check public.users
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .or('name.ilike.%Ian%,name.ilike.%Cherry%,username.ilike.%Ian%,username.ilike.%Cherry%');
        
    if (error) {
        console.error("Error fetching from public.users:", error);
        return;
    }
    
    console.log(`Found ${users.length} users in public.users:`);
    for (const u of users) {
        console.log(`- ID: ${u.id} | Name: ${u.name} | Username: ${u.username} | Email: ${u.email} | Role: ${u.role}`);
        
        // Check GoTrue
        const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(u.id);
        if (authErr) {
            console.log(`  -> GoTrue Error: ${authErr.message}`);
        } else if (authUser && authUser.user) {
            console.log(`  -> GoTrue Identity: ${authUser.user.email}`);
        } else {
            console.log(`  -> NO GoTrue identity found!`);
        }
    }
}

checkUsers();
