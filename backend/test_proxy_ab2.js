require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkProxyFetch() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Simulate what getProfile() on the backend actually executes.
    // getProfile uses token -> UUID -> public.users lookup.

    console.log("--- PROXY FETCH SIMULATION ---");

    const email1 = 'tumweabra@gmail.com';
    const email2 = 'abratumwe@gmail.com';

    const { data: id1 } = await supabaseService.from('users').select('*').eq('email', email1);
    const { data: id2 } = await supabaseService.from('users').select('*').eq('email', email2);

    console.log(`Email: ${email1}`);
    console.log(JSON.stringify(id1, null, 2));

    console.log(`\\nEmail: ${email2}`);
    console.log(JSON.stringify(id2, null, 2));
}
checkProxyFetch().catch(console.error);
