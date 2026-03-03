require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function match() {
    const coordinatorUid = '12c717fb-79ee-4f2d-9007-415928a5b778';
    const coordinator = 'vehicle';

    let query = supabase.from('vehicles').select('*');

    if (coordinatorUid && coordinator) {
        query = query.or(`coordinator_uid.eq.${coordinatorUid},coordinator.eq."${coordinator}"`);
    }

    const { data: vehiclesId, error } = await query;
    if (error) console.error('Error:', error.message);
    else console.log('Vehicles fetched successfully with OR:', vehiclesId.length);
}
match();
