const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAdminCouncil() {
    const verifiedEmail = 'admin@manifestms.com';
    const { data: councilUser, error: councilError } = await supabase
        .from('admin_council_users')
        .select('id, email, name, role')
        .eq('email', verifiedEmail)
        .single();
        
    console.log("admin_council_users result:", councilUser, councilError);
}
checkAdminCouncil();
