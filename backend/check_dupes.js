require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkDuplicates() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Check if Ebuflavia has multiple rows
    const { data: ebuf } = await supabaseService.from('users').select('id, username, email').eq('username', 'Ebuflavia');
    console.log("Ebuflavia rows:", ebuf.length);
    console.log(JSON.stringify(ebuf, null, 2));

    const { data: wilber } = await supabaseService.from('users').select('id, username, email').eq('username', 'Wilberforce');
    console.log("\\nWilberforce rows:", wilber.length);
    console.log(JSON.stringify(wilber, null, 2));

    // What if it searches by email?
    const { data: wilberEmail } = await supabaseService.from('users').select('id, username, email').eq('email', 'kalulewilberforce7@gmail.com');
    console.log("\\nWilberforce Email rows:", wilberEmail.length);
}

checkDuplicates().catch(console.error);
