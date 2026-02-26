const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function resetPendingUsers() {
    console.log("Fetching users with pending passwords...");

    // Select users where password starts with PENDING_
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, username, email, password')
        .like('password', 'PENDING_%');

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users found with pending passwords.");
        return;
    }

    console.log(`Found ${users.length} users to reset. Proceeding...`);

    for (const user of users) {
        console.log(`Resetting username for: ${user.name} (${user.email || 'no email'})`);

        const { error: updateError } = await supabase
            .from('users')
            .update({ username: null })
            .eq('id', user.id);

        if (updateError) {
            console.error(`Failed to reset ${user.name}:`, updateError);
        } else {
            console.log(`Successfully reset ${user.name}.`);
        }
    }

    console.log("Reset operation complete.");
}

resetPendingUsers();
