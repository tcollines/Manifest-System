const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findAutoUsers() {
    console.log("Fetching users...");
    const { data: users, error } = await supabase.from('users').select('*');

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    const autoUsers = users.filter(user => {
        const isAutoUsername = user.username && user.email && (user.username === user.email.split('@')[0] || user.username.startsWith('user_'));
        const hasPendingPassword = user.password && user.password.startsWith('PENDING_');
        return isAutoUsername || hasPendingPassword;
    });

    console.log(`Found ${autoUsers.length} users with potentially auto-generated attributes.`);

    const results = autoUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        password_type: u.password?.startsWith('PENDING_') ? 'PENDING_TOKEN' : 'SET',
        is_auto_username: u.username && u.email && (u.username === u.email.split('@')[0] || u.username.startsWith('user_'))
    }));

    fs.writeFileSync('auto_users_report.json', JSON.stringify(results, null, 2));
    console.log("Report saved to auto_users_report.json");

    // Print a quick summary
    console.table(results.slice(0, 20));
}

findAutoUsers();
