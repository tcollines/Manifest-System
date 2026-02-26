require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
    let out = "--- LOG OUTPUT ---\\n";
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: publicUser } = await supabaseService.from('users').select('*').ilike('username', 'aine').maybeSingle();
    out += `PUBLIC USER: ${JSON.stringify(publicUser, null, 2)}\\n`;

    if (!publicUser) {
        fs.writeFileSync('test_out.txt', out);
        return;
    }

    const { data: authData, error } = await supabaseService.auth.admin.getUserById(publicUser.id);
    out += `AUTH DATA: ${JSON.stringify(authData, null, 2)}\\n`;
    out += `AUTH ERROR: ${JSON.stringify(error, null, 2)}\\n`;

    fs.writeFileSync('test_out.txt', out);
}
run().catch(console.error);
