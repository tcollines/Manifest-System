const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: event, error: e1 } = await supabase.from('ministry_events').select('id, legacy_id').limit(1);
  console.log('Event:', event);

  const { data: att, error: e2 } = await supabase.from('service_attendance').select('service_id, manifest_id, member_id').limit(1);
  console.log('Attendance:', att);
}

run();
