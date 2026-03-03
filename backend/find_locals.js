require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function findLocals() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: authUsers } = await supabaseService.auth.admin.listUsers();
    const { data: publicUsers } = await supabaseService.from('users').select('id, username, email, name');

    fs.writeFileSync('all_public.json', JSON.stringify(publicUsers, null, 2));

    const locals = authUsers?.users?.filter(u => u.email && u.email.includes('@manifest.local')).map(u => ({
        id: u.id,
        email: u.email,
        created: u.created_at
    }));

    fs.writeFileSync('all_locals.json', JSON.stringify(locals, null, 2));

    console.log("Wrote all_public.json and all_locals.json");
}
findLocals().catch(console.error);
