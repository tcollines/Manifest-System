const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://poazorjmzswectxvakzl.supabase.co';
const supabaseKey = 'sb_secret_M5w-_KV6OtotRjn-KTw9Xg_6iUoezJP'; // Service role key
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: eventData } = await supabase.from('ministry_events').select('id, title').eq('title', 'The Inter-Schools Conference 2026').limit(1);
  if (!eventData || eventData.length === 0) return console.log("Event not found");

  const eventId = eventData[0].id;
  console.log("Event ID:", eventId);

  // Check `souls` table
  const { count: c1, data: d1 } = await supabase.from('souls').select('id, source_type, status', { count: 'exact' }).eq('source_id', eventId);
  console.log("Souls Table Count (by source_id):", c1);
  if(d1 && d1.length > 0) {
      console.log("Sample from souls:", d1.slice(0, 3));
  }
  
  const { count: c1b, data: d1b } = await supabase.from('souls').select('id, source_type, status', { count: 'exact' }).eq('event_id', eventId);
  console.log("Souls Table Count (by event_id):", c1b);

  // Check `next_gen_souls` table
  const { count: c2 } = await supabase.from('next_gen_souls').select('id', { count: 'exact' }).eq('service_id', eventId);
  console.log("NextGen Souls Table Count (by service_id):", c2);
  
  const { count: c3 } = await supabase.from('next_gen_souls').select('id', { count: 'exact' }).eq('event_id', eventId);
  console.log("NextGen Souls Table Count (by event_id):", c3);

  // What about Admin dashboard differences? 
  // Let's look at `souls`, `next_gen_souls` totals for the whole tenant.
  const { data: buwaya } = await supabase.from('ministry_events').select('manifest_id').eq('title', 'Buwaya Mission').limit(1);
  const manifestId = buwaya?.[0]?.manifest_id;

  const { count: totalSouls } = await supabase.from('souls').select('id', { count: 'exact' }).eq('manifest_id', manifestId);
  const { count: totalNGSouls } = await supabase.from('next_gen_souls').select('id', { count: 'exact' }).eq('manifest_id', manifestId);
  console.log("Total Souls (Tenant):", totalSouls);
  console.log("Total NextGen Souls (Tenant):", totalNGSouls);

}

run();
