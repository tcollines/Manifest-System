require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    try {
        const eventId = '9e402abf-53f2-4b99-9432-01bba2086e6e';
        let { data: st } = await supabase
            .from('pickup_stations')
            .select('id, name')
            .eq('event_id', eventId)
            .ilike('name', 'Private Transport')
            .maybeSingle();

        if (!st) {
            const { data: event } = await supabase
                .from('ministry_events')
                .select('manifest_id')
                .eq('id', eventId)
                .single();

            const { data: newSt, error: stErr } = await supabase
                .from('pickup_stations')
                .insert([{
                    id: uuidv4(),
                    manifest_id: event.manifest_id,
                    event_id: eventId,
                    name: 'Private Transport',
                    location: 'Public Commuters'
                }])
                .select('id, name')
                .single();

            if (stErr) {
                console.error("Error creating Private Transport station:", stErr);
                process.exit(1);
            }
            st = newSt;
        }

        console.log('PRIVATE_STATION_ID:', st.id);

        const { data: vehicles } = await supabase
            .from('vehicles')
            .select('id, number_plate')
            .or('number_plate.eq.PUBLIC TRANSPORT,number_plate.ilike.Private Car%,number_plate.eq.UAB 123N');

        if (vehicles && vehicles.length > 0) {
            const vehicleIds = vehicles.map(v => v.id);
            await supabase.from('vehicles').update({ station_id: st.id }).in('id', vehicleIds);
            await supabase.from('passengers').update({ station_id: st.id }).in('vehicle_id', vehicleIds);
            console.log('Re-assigned vehicles & passengers to Private Transport station:', vehicleIds);
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
