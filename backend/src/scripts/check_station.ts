import { supabase } from '../supabase';

async function run() {
  console.log("=== CHECKING STATION s-1770145860115 ===");
  const { data: station, error } = await supabase
    .from('pickup_stations')
    .select('*')
    .eq('id', 's-1770145860115')
    .maybeSingle();

  if (error) console.error(error);
  else console.log("Station by legacy ID:", JSON.stringify(station, null, 2));

  // Let's search by name "Parking" or other stations
  const { data: stations, error: err2 } = await supabase
    .from('pickup_stations')
    .select('id, name, event_id, department_id')
    .limit(10);
  console.log("Some stations:", JSON.stringify(stations, null, 2));
}

run().catch(console.error);
