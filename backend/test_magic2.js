require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testMagicLinkFallback() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: publicUser } = await supabaseService.from('users').select('*').eq('email', 'tumweabra@gmail.com').maybeSingle();
    const { data: authUser } = await supabaseService.auth.admin.getUserById(publicUser.id);

    fs.writeFileSync('tumble3_dump.json', JSON.stringify({
        publicUser,
        authUser: authUser.user
    }, null, 2));

    console.log("Wrote tumble3_dump.json");
}
testMagicLinkFallback().catch(console.error);
