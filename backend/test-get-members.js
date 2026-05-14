const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/Manifest System/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing credentials in backend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, count, error } = await supabase
    .from('members')
    .select('id, name, category, phone, status, check_in_time, gender, residency, born_again, joined_date, attended_service_ids, created_at, occupation, place_of_work', { count: 'exact' })
    .limit(1);

  if (error) {
    console.log("ERROR:", error);
  } else {
    console.log("SUCCESS. Count:", count);
  }
}

run();
