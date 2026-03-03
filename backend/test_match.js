require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function match() {
    const { data: users } = await supabase.from('users').select('*').eq('name', 'vehicle');
    if (!users || !users.length) return console.log('User vehicle not found');
    const user = users[0];
    console.log('User:', user);

    const { data: vehiclesId } = await supabase.from('vehicles').select('*').eq('coordinator_uid', user.id);
    const { data: vehiclesName } = await supabase.from('vehicles').select('*').eq('coordinator', user.name);

    console.log('Vehicles by UID:', vehiclesId);
    console.log('Vehicles by Name:', vehiclesName);
}
match();
