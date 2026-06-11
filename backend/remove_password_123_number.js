require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function removeDefaultPassword123_Number() {
    console.log("Looking for users with '123'...");
    
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, username, password')
        .eq('password', '123');
        
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }
    
    console.log(`Found ${users.length} users with password '123'.`);
    
    if (users.length > 0) {
        const { data: updated, error: updateError } = await supabase
            .from('users')
            .update({ password: null })
            .eq('password', '123')
            .select();
            
        if (updateError) {
            console.error("Error updating users:", updateError);
        } else {
            console.log(`Successfully removed '123' from ${updated.length} users.`);
        }
    }
}

removeDefaultPassword123_Number();
