require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkKokoAuthStatus() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: listData, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error("List users error:", error);
        return;
    }

    const koko = listData.users.find(u => u.email.toLowerCase() === 'kweenkoko3@gmail.com');
    if (!koko) {
        console.log("Koko NOT FOUND in auth.users by email!");
        return;
    }

    console.log("Found Koko:", koko.id);
    console.log("Email Confirmed At:", koko.email_confirmed_at || "NULL/UNDEFINED");
    console.log("Is Banned:", !!koko.banned_until);

    // Attempt explicit manual re-verification just in case
    console.log("Attempting to force confirm email...");
    const { error: confErr } = await supabase.auth.admin.updateUserById(koko.id, {
        email_confirm: true
    });

    if (confErr) {
        console.error("Force confirm error:", confErr);
    } else {
        console.log("Successfully ran explicit email_confirm: true flag on Koko's GoTrue identity.");
    }
}

checkKokoAuthStatus().catch(console.error);
