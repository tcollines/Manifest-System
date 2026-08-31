const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testLogin() {
    const email = 'admin@manifestms.com';
    const password = 'emf@phaneroo';
    
    // First let's update the password to be absolutely sure
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    
    if (user) {
        console.log("Updating password to ensure it is correct...");
        await supabase.auth.admin.updateUserById(user.id, { password: password });
        console.log("Password updated.");
    } else {
        console.log("User not found in listUsers!");
    }

    // Now try to sign in normally to see if auth works
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        console.error("Login failed:", error.message);
    } else {
        console.log("Login succeeded for:", data.user.email);
    }
}

testLogin();
