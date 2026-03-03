require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkMultipleUsers() {
    console.log("--- MULTI USER INVESTIGATION ---");
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Check tumweabra@gmail.com and abratumwe@gmail.com
    const emails = ['tumweabra@gmail.com', 'abratumwe@gmail.com', 'abraham@manifest.local'];

    console.log("\\n1. checking public.users");
    const { data: publicUsers } = await supabaseService.from('users').select('*').in('email', emails);
    for (const u of publicUsers || []) {
        console.log(`- DB User: ${u.email} | ID: ${u.id} | Role: ${u.role}`);
    }

    console.log("\\n2. checking auth.users");
    const { data: authUsers } = await supabaseService.auth.admin.listUsers();

    for (const email of emails) {
        const authRow = authUsers?.users?.find(u => u.email === email);
        if (authRow) {
            console.log(`- Auth User: ${email} | ID: ${authRow.id} | JWT Role: ${authRow.app_metadata.role}`);
            console.log(`  Identities: ${JSON.stringify(authRow.identities?.map(i => i.identity_data.email))}`);
        } else {
            console.log(`- Auth User: ${email} -> NOT FOUND IN AUTH.USERS`);
        }
    }
}
checkMultipleUsers().catch(console.error);
