const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('service_attendance').select('*').limit(1);
  console.log('Access check:', error ? error : 'Success, can read table via API');

  // Let's also check if we can read with an anonymous key to simulate RLS
  const anonSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const { data: anonData, error: anonError } = await anonSupabase.from('service_attendance').select('*').limit(1);
  console.log('Anon access check:', anonError ? anonError.message : 'Success');
}

run();
