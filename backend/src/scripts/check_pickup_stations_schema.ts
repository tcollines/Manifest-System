import { supabase } from '../supabase';

async function run() {
  console.log("=== FETCHING ONE STATION TO SEE COLUMNS ===");
  const { data: stations, error } = await supabase
    .from('pickup_stations')
    .select('*')
    .limit(1);

  if (error) console.error(error);
  else console.log("Station sample:", JSON.stringify(stations, null, 2));
}

run().catch(console.error);
