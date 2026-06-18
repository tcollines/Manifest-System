import { supabase } from '../supabase';

async function run() {
  console.log("=== CHECKING EVENTS IN DB ===");
  const { data: events, error } = await supabase
    .from('ministry_events')
    .select('id, title, date, created_at')
    .order('date', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  console.log("All events:");
  events.forEach(e => {
    console.log(`- Title: ${e.title} | Date: ${e.date} | ID: ${e.id} | Created: ${e.created_at}`);
  });
}

run().catch(console.error);
