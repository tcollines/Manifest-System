require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkGhosts() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Check if flaviamulen5@gmail.com actually exists in GoTrue, and what ID it has!
    const { data: qData, error } = await supabaseService.auth.admin.listUsers();

    const ghostEbuf = qData.users.find(u => u.email === 'flaviamulen5@gmail.com');
    const ghostTl = qData.users.find(u => u.email === 'gmawanda307@gmail.com');

    fs.writeFileSync('ghost_accounts.json', JSON.stringify({
        ghostEbuf: ghostEbuf || null,
        ghostTl: ghostTl || null
    }, null, 2));

    console.log("Wrote ghost_accounts.json");
}

checkGhosts().catch(console.error);
