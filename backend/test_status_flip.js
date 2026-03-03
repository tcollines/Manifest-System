require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testStatusFlip() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    const supabaseAnon = createClient(process.env.SUPABASE_URL, anonKey);

    console.log("--- STATUS FLIP HEURISTIC TEST ---");

    // 1. Fetch Ebuflavia pre-flip
    const { data: ebufPre } = await supabaseService.from('users').select('id, email, password').eq('username', 'Ebuflavia').single();

    // 2. Set Status to Active
    await supabaseService.from('users').update({ status: 'Active' }).eq('id', ebufPre.id);
    console.log("[1] Flipped Ebuflavia to Active.");

    // 3. Test GoTrue Login
    console.log("[2] Pinging GoTrue...");
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
        email: ebufPre.email,
        password: ebufPre.password
    });

    if (error) {
        console.log("Hook still crashed:", error.message);
    } else {
        console.log("SUCCESS! JWT Minted!", data.session.access_token.substring(0, 20) + '...');
    }

    // 4. Revert Status
    await supabaseService.from('users').update({ status: 'Pending' }).eq('id', ebufPre.id);
    console.log("[3] Reverted Ebuflavia to Pending.");
}
testStatusFlip().catch(console.error);
