const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAuthUser() {
    const email = 'abratumwe@gmail.com';
    const sub = '55bbc8c5-ee4b-4869-8b83-5116e987145c';

    console.log(`--- Checking Auth User: ${email} / ${sub} ---`);

    const { data: byEmail, error: e1 } = await supabase.auth.admin.listUsers({
        filter: { email: email }
    });
    console.log("Admin list by email filter:", JSON.stringify(byEmail, null, 2), e1);

    const { data: byId, error: e2 } = await supabase.auth.admin.getUserById(sub);
    console.log("Admin getUserById results:", JSON.stringify(byId, null, 2), e2);

    // Also check public.users for this specific ID again
    const { data: publicUser } = await supabase.from('users').select('*').eq('id', sub).maybeSingle();
    console.log("Public.users search by ID:", publicUser);
}

checkAuthUser();
