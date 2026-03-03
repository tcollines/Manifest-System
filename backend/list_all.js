require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function listAll() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: users } = await supabaseService.from('users').select('id, name, username, email, role');
    console.table(users);
}
listAll().catch(console.error);
