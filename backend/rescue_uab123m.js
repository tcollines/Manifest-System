require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function forceStageFix() {
    console.log("Locating UAB 123M...");

    const { data: vehicles, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .ilike('number_plate', '%123M%');

    if (fetchError || !vehicles || vehicles.length === 0) {
        console.error("Could not find any vehicles matching 123M.", fetchError);
        return;
    }

    const vehicle = vehicles[0];
    console.log(`Found vehicle: ${vehicle.number_plate} in stage ${vehicle.current_stage}`);
    console.log(`Approvals:`, vehicle.approvals);

    const { error: updateError } = await supabase
        .from('vehicles')
        .update({
            current_stage: 'Arrived',
            approvals: { finance: 'Approved', registration: 'Approved' },
            ongoing_arrival_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
        .eq('id', vehicle.id);

    if (updateError) {
        console.error("Failed to rescue vehicle:", updateError);
    } else {
        console.log(`SUCCESS! ${vehicle.number_plate} has been successfully forced to 'Arrived'.`);
    }
}

forceStageFix();
