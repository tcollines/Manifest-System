import { supabase } from '../supabase';

async function run() {
  console.log("=== CHECKING KOKO (EUNICE ATUNU) ===");
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', '%koko%')
    .maybeSingle();

  if (error) console.error(error);
  else console.log("Koko user:", JSON.stringify(user, null, 2));
}

run().catch(console.error);
