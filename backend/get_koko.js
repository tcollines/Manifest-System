require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function getKoko() {
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabaseService.from('users').select('username, email, password').ilike('username', '%Koko%');
    console.log(JSON.stringify(data, null, 2));
}

getKoko();
