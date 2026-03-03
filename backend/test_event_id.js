require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function match() {
    const { data: events } = await supabase.from('ministry_events').select('*').ilike('title', '%MEN GATHER IX%');
    console.log('Events:', events);

    const { data: vehicles } = await supabase.from('vehicles').select('*').ilike('number_plate', '%UAB 123M%');
    console.log('Vehicles:', vehicles);
}
match();
