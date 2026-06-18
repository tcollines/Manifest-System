import { supabase } from '../supabase';

async function run() {
  console.log("=== CHECKING MGP EVENT ===");
  const { data: event, error } = await supabase
    .from('ministry_events')
    .select('*')
    .eq('id', '7ebca242-9f6b-43f9-aa5a-06355ef5c1f4')
    .maybeSingle();

  if (error) console.error(error);
  else console.log("MGP Event:", JSON.stringify(event, null, 2));

  console.log("=== CHECKING ALL RECENT EVENTS ===");
  const { data: events, error: err2 } = await supabase
    .from('ministry_events')
    .select('id, title, date, status')
    .order('date', { ascending: false })
    .limit(10);
  if (err2) console.error(err2);
  else console.log("Recent Events:", JSON.stringify(events, null, 2));
}

run().catch(console.error);
