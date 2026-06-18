import { supabase } from '../supabase';

async function run() {
  console.log("=== FETCHING ALL PICKUP STATIONS ===");
  const { data: stations, error } = await supabase
    .from('pickup_stations')
    .select('id, name, event_id, department_id');

  if (error) console.error(error);
  else console.log("All stations:", JSON.stringify(stations, null, 2));
}

run().catch(console.error);
