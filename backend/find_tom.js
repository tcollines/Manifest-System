require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function findGhostAuths() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("--- FINDING GHOST AUTHS ---");
    const { data: authUsers } = await supabaseService.auth.admin.listUsers();

    authUsers?.users?.forEach(u => {
        if (u.email.includes('tom') || u.email.includes('abraham')) {
            console.log(`FOUND MISSING AUTH: ID: ${u.id} | Email: ${u.email}`);
        }
    });

    console.log("\\n--- PUBLIC PROFILE MATCHES ---");
    const { data: publicUsers } = await supabaseService.from('users').select('id, email, username').in('username', ['tom', 'abraham']);
    console.log(publicUsers);
}
findGhostAuths().catch(console.error);
