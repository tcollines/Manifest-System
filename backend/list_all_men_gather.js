require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listVehicles() {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) {
        console.error(error);
        return;
    }
    const menGather = data.filter(v => v.event_id === 'f3976613-0887-4138-b2e1-63a8a5824cdd');
    console.log(`Total MEN GATHER vehicles: ${menGather.length}`);
    menGather.forEach(v => {
        console.log(`- ${v.number_plate} (ID: ${v.id}, Station: ${v.station_id})`);
    });
}

listVehicles();
