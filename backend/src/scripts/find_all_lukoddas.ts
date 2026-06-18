import { supabase } from '../supabase';

async function run() {
  console.log("=== SCANNING FOR ALL LUKODDA ENTRIES ===");

  const { data: allUsers, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', '%lukodda%');

  if (error) {
    console.error(error);
  } else {
    console.log("All matching users:", JSON.stringify(allUsers, null, 2));
  }
}

run().catch(console.error);
