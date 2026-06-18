import { supabase } from '../supabase';

async function run() {
  console.log("=== CHECKING LUKODDA JOSEPH STATE IN DB & AUTH ===");

  // 1. Search in public.users
  const { data: dbUsers, error: dbErr } = await supabase
    .from('users')
    .select('*')
    .ilike('name', '%Lukodda%');

  if (dbErr) {
    console.error("Error fetching from public.users:", dbErr);
  } else {
    console.log("Matches in public.users:", JSON.stringify(dbUsers, null, 2));
  }

  // 2. Search all GoTrue auth users
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (authErr) {
    console.error("Error listing auth users:", authErr);
  } else {
    const matchingAuth = authUsers.filter(u => 
      u.email?.toLowerCase().includes('joseph') ||
      u.email?.toLowerCase().includes('jose') ||
      u.email?.toLowerCase().includes('lukodda') ||
      (u.user_metadata && JSON.stringify(u.user_metadata).toLowerCase().includes('joseph'))
    );
    console.log("Matches in Supabase Auth:", JSON.stringify(matchingAuth, null, 2));
  }

  // 3. Search for MGP temp user
  const { data: mgpUsers, error: mgpErr } = await supabase
    .from('users')
    .select('*')
    .eq('username', 'stage'); // commonly used temp usernames
  console.log("Users with username 'stage':", JSON.stringify(mgpUsers, null, 2));

  const { data: allStageCoords, error: scErr } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'Stage Coordinator');
  console.log("Users with role 'Stage Coordinator':", JSON.stringify(allStageCoords, null, 2));
}

run().catch(console.error);
