const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);

async function check() {
    const { data, error } = await supabase.from('users').select('id, name, username, email, role, password').in('role', ['Logistics', 'Stage Coordinator', 'Vehicle Coordinator']).order('created_at', { ascending: false }).limit(10);
    console.log("DB public.users:");
    console.log(data);

    const { data: authUsers } = await supabase.auth.admin.listUsers();
    console.log("\nAuth Users:");
    authUsers.users.forEach(u => console.log(`ID: ${u.id}, Email: ${u.email}`));
}
check();
