require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function inspectGoTrue() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // tl@entebbemanifest.com
    const { data: tl } = await supabaseService.auth.admin.getUserById('5ed14837-4427-42d8-8496-8e7bbcf92ffd');
    console.log("TL GoTrue User:");
    console.log(JSON.stringify(tl?.user, null, 2));

    // Ebuflavia
    const { data: ebuf } = await supabaseService.auth.admin.getUserById('d7d013ab-c518-4a38-82e6-528ab46a9cfe');
    console.log("\\nEbuflavia GoTrue User:");
    console.log(JSON.stringify(ebuf?.user, null, 2));
}

inspectGoTrue().catch(console.error);
