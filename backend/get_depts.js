require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');

async function getDept() {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await sb.from('departments').select('id, name');
    console.table(data);
}
getDept();
