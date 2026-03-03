require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function forceKillKoko() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const kokoEmail = 'Kweenkoko3@gmail.com';
    const kokoId = '3acd96fb-0ec1-4824-8149-dcd5d13da04d';

    console.log("Forcing GoTrue Ghost purges for Koko...");
    // 1. Delete by explicit UUID mapping
    const { error: err1 } = await supabase.auth.admin.deleteUser(kokoId);
    if (err1) console.log("UUID Delete Res:", err1.message);
    else console.log("UUID Delete Success!");

    // 2. Just in case there's another stray UUID with her email...
    // The only way to find it if listUsers hides it is SQL. Let's do that via postgres raw if needed... but let's try the recreate script first.
}

forceKillKoko().then(() => {
    console.log("Running recreation REST hook...");
    return fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: '3acd96fb-0ec1-4824-8149-dcd5d13da04d',
            email: 'Kweenkoko3@gmail.com',
            password: 'Isaiah40:31',
            email_confirm: true,
            user_metadata: { role: 'Member' }
        })
    });
}).then(res => res.text()).then(t => console.log('Recreate:', t)).catch(console.error);
