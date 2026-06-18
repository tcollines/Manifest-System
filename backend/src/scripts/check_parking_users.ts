import { supabase } from '../supabase';

async function run() {
  console.log("=== CHECKING PARKING DEPT USERS ===");
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('department_id', '65808f94-cf1c-4e0f-b7f0-d3ac2b49d20a');

  if (error) console.error(error);
  else console.log("Parking users:", JSON.stringify(users, null, 2));
}

run().catch(console.error);
