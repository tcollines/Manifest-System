require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
    const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    console.log("Testing GoTrue for Koko...");
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
        email: 'Kweenkoko3@gmail.com',
        password: 'Isaiah40:31'
    });
    if (error) {
        console.error("Auth Error:", error.message);
    } else {
        console.log("Success! Session:", !!data.session);
    }
}
test();
