require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function restrictPasswordsToMGP() {
    const MGP_EVENT_ID = '7ebca242-9f6b-43f9-aa5a-06355ef5c1f4';
    
    console.log("Restricting temp user logins strictly to MGP VIII...");
    
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, event_id, role, password')
        .in('role', ['Logistics', 'Stage Coordinator', 'Vehicle Coordinator', 'Coordinator', 'Resident Coordinator'])
        .neq('event_id', MGP_EVENT_ID);
        
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }
    
    // Also fetch those with null event_id just in case
    const { data: nullEventUsers, error: err2 } = await supabase
        .from('users')
        .select('id, name, event_id, role, password')
        .in('role', ['Logistics', 'Stage Coordinator', 'Vehicle Coordinator', 'Coordinator', 'Resident Coordinator'])
        .is('event_id', null);
        
    const allUsersToLock = [...users, ...(nullEventUsers || [])];
    
    console.log(`Found ${allUsersToLock.length} temp users NOT belonging to MGP VIII.`);
    
    let dbCleared = 0;
    let authDeleted = 0;
    
    for (const u of allUsersToLock) {
        // Clear public.users password
        if (u.password) {
            await supabase.from('users').update({ password: null }).eq('id', u.id);
            dbCleared++;
        }
        
        // Delete from Auth vault
        const { error: authErr } = await supabase.auth.admin.deleteUser(u.id);
        if (!authErr) {
            authDeleted++;
        }
    }
    
    console.log(`Operation complete.`);
    console.log(`- Cleared database passwords for: ${dbCleared} old temp users.`);
    console.log(`- Completely revoked auth logins for: ${authDeleted} old temp users.`);
}

restrictPasswordsToMGP();
