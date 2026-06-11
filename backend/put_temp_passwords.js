require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function putTempUserPasswords() {
    console.log("Setting passwords to '123' for temp users...");
    
    // Find all temporary users
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, role, password')
        .in('role', ['Logistics', 'Stage Coordinator', 'Vehicle Coordinator', 'Coordinator', 'Resident Coordinator']);
        
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }
    
    // Filter users whose password is not already '123'
    const usersToUpdate = users.filter(u => u.password !== '123');
    
    console.log(`Found ${usersToUpdate.length} temp users needing a password update.`);
    
    if (usersToUpdate.length > 0) {
        const ids = usersToUpdate.map(u => u.id);
        
        const { data: updated, error: updateError } = await supabase
            .from('users')
            .update({ password: '123' })
            .in('id', ids)
            .select();
            
        if (updateError) {
            console.error("Error updating users:", updateError);
        } else {
            console.log(`Successfully updated ${updated.length} temp users' passwords to '123'.`);
        }
    }
}

putTempUserPasswords();
