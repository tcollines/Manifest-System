require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStations() {
    const eventId = 'f3976613-0887-4138-b2e1-63a8a5824cdd';

    const { data: stations, error: sError } = await supabase
        .from('pickup_stations')
        .select('id, name')
        .eq('event_id', eventId);

    if (sError) {
        console.error(sError);
        return;
    }

    console.log(`Stations for event ${eventId}:`);
    stations.forEach(s => console.log(`- ${s.name} (ID: ${s.id})`));

    const { data: vehicles, error: vError } = await supabase
        .from('vehicles')
        .select('number_plate, station_id')
        .eq('event_id', eventId);

    if (vError) {
        console.error(vError);
        return;
    }

    console.log('\nVehicle Stations:');
    const stationIds = stations.map(s => s.id);
    vehicles.forEach(v => {
        const isMapped = stationIds.includes(v.station_id);
        console.log(`- ${v.number_plate}: Station ${v.station_id} ${isMapped ? '(OK)' : '(NOT IN EVENT STATIONS!)'}`);
    });
}

checkStations();
