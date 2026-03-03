require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStation() {
    const { data, error } = await supabase.from('pickup_stations')
        .select('*')
        .eq('id', 'e7ec23be-471d-419d-850f-7b671e8571cf');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Station Match: ${data.length ? data[0].name : "NOT FOUND!"}`);
}

checkStation();
