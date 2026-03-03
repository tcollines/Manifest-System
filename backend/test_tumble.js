require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkTumbleUsers() {
    console.log("--- FOCUSED IDENTITY TRACE ---");
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Check tumweabra@gmail.com explicitly
    const emails = ['tumweabra@gmail.com', 'abratumwe@gmail.com'];

    console.log("\\n--- PUBLIC USERS ---");
    const { data: publicUsers } = await supabaseService.from('users').select('id, email, role, name').in('email', emails);
    console.log(JSON.stringify(publicUsers, null, 2));

    console.log("\\n--- AUTH USERS ---");
    const { data: authUsers } = await supabaseService.auth.admin.listUsers();

    const relevantAuths = authUsers?.users?.filter(u => emails.includes(u.email));

    for (const au of relevantAuths || []) {
        console.log(`Email: ${au.email} | ID: ${au.id}`);
        console.log(`Role in JWT: ${au.app_metadata.role}`);
        console.log(`Identities: ${JSON.stringify(au.identities)}`);
    }

    if (relevantAuths?.length === 0) {
        console.log("NEITHER email found in auth.users!");
    }
}
checkTumbleUsers().catch(console.error);
