require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

Promise.all([
    supabase.from('users').select('id, name, role, manifest_id').ilike('name', '%vehicle%'),
    supabase.from('vehicles').select('id, number_plate, coordinator, coordinator_uid, manifest_id')
]).then(([users, vehicles]) => {
    console.log('Users:', JSON.stringify(users.data, null, 2));
    console.log('Vehicles:', JSON.stringify(vehicles.data, null, 2));
}).catch(console.error);
