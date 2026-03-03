require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkVehicle() {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) {
        console.error(error);
        return;
    }
    const myVeh = data.filter(v => v.number_plate && v.number_plate.includes('123M'));
    console.log(JSON.stringify(myVeh, null, 2));
}

checkVehicle();
