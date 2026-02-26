
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- INSPECTING PERSONAL VEHICLES ---');

    const { data: vehicles, error } = await supabase
        .from('personal_vehicles')
        .select(`
            id, 
            number_plate, 
            status, 
            current_service_id, 
            legacy_current_service_id,
            check_in_time
        `)
        .eq('status', 'Checked In');

    if (error) {
        console.error('Error fetching vehicles:', error);
        return;
    }

    if (vehicles.length === 0) {
        console.log('No vehicles with status "Checked In" found.');
    } else {
        console.log(`Found ${vehicles.length} Checked In vehicles:`);
        vehicles.forEach(v => {
            console.log(`[${v.number_plate}]`);
            console.log(`  UUID Status:    ${v.current_service_id ? 'SET (' + v.current_service_id + ')' : 'NULL'}`);
            console.log(`  Legacy Status:  ${v.legacy_current_service_id ? 'SET (' + v.legacy_current_service_id + ')' : 'NULL'}`);
            console.log(`  CheckIn Time:   ${v.check_in_time}`);
        });
    }

    // Also check one that is NOT checked in updates
    console.log('\n--- Checking 1 Absent Vehicle ---');
    const { data: absent } = await supabase.from('personal_vehicles').select('id, number_plate, current_service_id').eq('status', 'Absent').limit(1);
    if (absent && absent.length > 0) {
        console.log(`Sample Absent: ${absent[0].number_plate} (CSID: ${absent[0].current_service_id})`);
    }
}

inspect();
