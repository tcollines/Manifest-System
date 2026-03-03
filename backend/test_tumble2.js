require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkTumbleUsers() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const emails = ['tumweabra@gmail.com', 'abratumwe@gmail.com'];

    const { data: publicUsers } = await supabaseService.from('users').select('id, email, role, name').in('email', emails);
    const { data: authUsers } = await supabaseService.auth.admin.listUsers();

    const relevantAuths = authUsers?.users?.filter(u => emails.includes(u.email));

    const output = {
        publicUsers,
        authUsers: relevantAuths?.map(au => ({
            id: au.id,
            email: au.email,
            role_in_jwt: au.app_metadata.role,
            identities: au.identities
        }))
    };

    fs.writeFileSync('tumble_dump.json', JSON.stringify(output, null, 2));
    console.log("Wrote tumble_dump.json");
}
checkTumbleUsers().catch(console.error);
