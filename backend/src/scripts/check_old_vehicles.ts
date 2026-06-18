import { supabase } from '../supabase';

async function run() {
  console.log("=== CHECKING VEHICLES FOR 6ef635f1-d285-4188-baca-612c8a19e4db ===");
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, number_plate, coordinator, event_id, station_id')
    .eq('event_id', '6ef635f1-d285-4188-baca-612c8a19e4db');

  if (error) console.error(error);
  else console.log("Vehicles:", JSON.stringify(vehicles, null, 2));

  // Let's also check pickup_stations for this event
  const { data: stations, error: stErr } = await supabase
    .from('pickup_stations')
    .select('id, name, event_id')
    .eq('event_id', '6ef635f1-d285-4188-baca-612c8a19e4db');

  if (stErr) console.error(stErr);
  else console.log("Stations:", JSON.stringify(stations, null, 2));

  // Let's also check if we can query for ANY event that is not in the ministry_events list but referenced in vehicles
  const { data: allVehicles, error: vehErr } = await supabase
    .from('vehicles')
    .select('event_id');
  if (allVehicles) {
    const uniqueEvents = [...new Set(allVehicles.map(v => v.event_id))];
    console.log("Unique event_ids in vehicles:", uniqueEvents);
  }
}

run().catch(console.error);
