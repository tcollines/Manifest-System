require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkEmails() {
    console.log("Checking GoTrue for manifest.local emails...");
    
    const emails = ['ian@manifest.local', 'cherry@manifest.local', 'vivian@manifest.local'];
    
    for (const email of emails) {
        // We can't directly query GoTrue by email easily without listUsers, but let's try calling auth.admin.listUsers() 
        const { data: users, error } = await supabase.auth.admin.listUsers();
        if (error) {
            console.error("Error listing users:", error);
            return;
        }
        
        const found = users.users.find(u => u.email === email);
        if (found) {
            console.log(`FOUND: ${email} -> User ID: ${found.id}`);
        } else {
            console.log(`NOT FOUND: ${email}`);
        }
    }
}

checkEmails();
