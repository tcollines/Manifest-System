require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkStations() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, username, event_id, station_id, role')
        .or('name.ilike.%Ian%,name.ilike.%Cherry%,username.ilike.%Ian%,username.ilike.%Cherry%');
        
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }
    
    console.log("Users and Stations:");
    for (const u of users) {
        console.log(`- ${u.name} | Station: ${u.station_id} | Event: ${u.event_id}`);
        
        if (u.station_id) {
            const { data: station } = await supabase
                .from('pickup_stations')
                .select('event_id, name')
                .eq('id', u.station_id)
                .single();
                
            if (station) {
                console.log(`  -> Station Belongs to Event: ${station.event_id} (${station.name})`);
            }
        }
    }
}

checkStations();
