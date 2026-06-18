import { supabase } from '../supabase';

async function run() {
  console.log("=== CHECKING MGP STATIONS ===");
  const { data: stations, error } = await supabase
    .from('pickup_stations')
    .select('*')
    .eq('event_id', '7ebca242-9f6b-43f9-aa5a-06355ef5c1f4');

  if (error) console.error(error);
  else console.log("MGP Stations:", JSON.stringify(stations, null, 2));
}

run().catch(console.error);
