require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function fixMissingGoTrueUsers() {
    console.log("Looking for Logistics/Data Entrants missing from the Auth Vault...");
    
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['Logistics', 'Stage Coordinator', 'Vehicle Coordinator', 'Coordinator', 'Resident Coordinator'])
        .neq('status', 'Deleted');
        
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }
    
    let fixedCount = 0;
    
    for (const u of users) {
        const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(u.id);
        
        if (authErr && authErr.message.includes('User not found')) {
            console.log(`Missing Auth for: ${u.name} (@${u.username}) - ID: ${u.id}`);
            
            // Recreate synthetic email
            const syntheticEmail = u.email || `${(u.username || u.name.split(' ')[0]).toLowerCase().replace(/\s+/g, '')}@manifest.local`;
            
            console.log(` -> Creating GoTrue identity with email: ${syntheticEmail} and password: 123`);
            
            const { error: createErr } = await supabase.auth.admin.createUser({
                id: u.id,
                email: syntheticEmail,
                password: '123',
                email_confirm: true,
                user_metadata: { name: u.name, role: u.role }
            });
            
            if (createErr) {
                console.error(` -> Failed to create auth user:`, createErr.message);
            } else {
                console.log(` -> SUCCESS! Auth profile restored.`);
                fixedCount++;
            }
        }
    }
    
    console.log(`\nOperation Complete. Restored Auth for ${fixedCount} users.`);
}

fixMissingGoTrueUsers();
