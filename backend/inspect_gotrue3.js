require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function inspectGoTrue() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // aine
    const { data: aine } = await supabaseService.auth.admin.getUserById('0f3526c4-f8b0-460a-b649-c435434f2ea4');

    // Ebuflavia
    const { data: ebuf } = await supabaseService.auth.admin.getUserById('d7d013ab-c518-4a38-82e6-528ab46a9cfe');

    // Wilberforce
    const { data: wilber } = await supabaseService.auth.admin.getUserById('c98b24b4-c675-4827-8875-b9bee52d308a');

    const output = {
        aine: aine?.user,
        ebuflavia: ebuf?.user,
        wilberforce: wilber?.user
    };

    fs.writeFileSync('gotrue_users_2.json', JSON.stringify(output, null, 2));
    console.log("Wrote gotrue_users_2.json");
}

inspectGoTrue().catch(console.error);
