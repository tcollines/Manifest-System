const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deepVerify() {
    const email = 'abratumwe@gmail.com';
    console.log(`--- Deep Verification for ${email} ---`);

    // 1. Auth.Users
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === email);
    if (!authUser) {
        console.log("CRITICAL: User not found in auth.users by email!");
    } else {
        console.log(`Auth User Found! ID: ${authUser.id}`);
    }

    // 2. Public.users Case Sensitivity Test
    const { data: d1 } = await supabase.from('users').select('id, email').eq('email', email).maybeSingle();
    console.log("Query 'users':", d1);

    const { data: d2 } = await supabase.from('Users').select('id, email').eq('email', email).maybeSingle();
    console.log("Query 'Users':", d2);

    const { data: d3 } = await supabase.from('public.users').select('id, email').eq('email', email).maybeSingle();
    console.log("Query 'public.users':", d3);
}

deepVerify();
