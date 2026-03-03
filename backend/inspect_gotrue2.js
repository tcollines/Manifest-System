require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function inspectGoTrue() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // tl@entebbemanifest.com
    const { data: tl } = await supabaseService.auth.admin.getUserById('5ed14837-4427-42d8-8496-8e7bbcf92ffd');

    // Ebuflavia
    const { data: ebuf } = await supabaseService.auth.admin.getUserById('d7d013ab-c518-4a38-82e6-528ab46a9cfe');

    const output = {
        tl: tl?.user,
        ebuflavia: ebuf?.user
    };

    fs.writeFileSync('gotrue_users.json', JSON.stringify(output, null, 2));
    console.log("Wrote gotrue_users.json");
}

inspectGoTrue().catch(console.error);
