import { supabase } from '../supabase';

async function run() {
  console.log("=== FETCHING DEPARTMENTS ===");
  const { data: depts, error: deptErr } = await supabase
    .from('departments')
    .select('*');
  if (deptErr) console.error(deptErr);
  else console.log("Departments:", JSON.stringify(depts, null, 2));

  console.log("=== FETCHING EVENTS ===");
  const { data: events, error: evErr } = await supabase
    .from('events')
    .select('*');
  if (evErr) console.error(evErr);
  else console.log("Events:", JSON.stringify(events, null, 2));
}

run().catch(console.error);
