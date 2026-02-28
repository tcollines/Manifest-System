require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFleet() {
    const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('event_id', 'f3976613-0887-4138-b2e1-63a8a5824cdd');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Checking ${vehicles.length} vehicles for MEN GATHER IX:`);
    vehicles.forEach(v => {
        console.log(`- ${v.number_plate}:`);
        console.log(`  Stage: ${v.current_stage}`);
        console.log(`  Status: ${v.status}`);
        console.log(`  Approvals: ${JSON.stringify(v.approvals)}`);
        console.log(`  Direction: ${v.journey_direction}`);
        console.log(`  Ongoing Dispatch: ${v.finance_details?.ongoingDispatch}`);
        console.log(`  Ongoing Timing: Start: ${v.ongoing_start_time}, Arrived: ${v.ongoing_arrival_time}`);
        console.log(`  Return Timing: Start: ${v.return_start_time}, Arrived: ${v.return_arrival_time}`);
        console.log('-------------------');
    });
}

checkFleet();
