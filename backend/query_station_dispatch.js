require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStationDispatches() {
    const { data, error } = await supabase.from('vehicles')
        .select('*')
        .eq('station_id', 'e7ec23be-471d-419d-850f-7b671e8571cf');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Vehicles on UAB 123M Station: ${data.length}`);
    data.forEach(v => {
        console.log(`\n- ${v.number_plate}`);
        console.log(`  Approvals:`, v.approvals);
        console.log(`  Finance Details:`, v.finance_details);
    });
}

checkStationDispatches();
