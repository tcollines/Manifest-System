require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: buwaya } = await supabase.from('ministry_events').select('manifest_id').eq('title', 'Buwaya Mission').limit(1);
  const manifestId = buwaya?.[0]?.manifest_id;
  
  if (!manifestId) {
      console.error("Could not find manifest_id");
      return;
  }

  // Filter ONLY by type = 'Event'
  const { data: events, error: err1 } = await supabase.from('ministry_events')
    .select('id, title, date, type')
    .eq('manifest_id', manifestId)
    .eq('type', 'Event'); // <--- Fix here
  if (err1) { console.error('Events error:', err1); return; }
  
  const { data: souls, error: err2 } = await supabase.from('souls')
    .select('source_id, status, first_name, last_name, phone')
    .eq('source_type', 'Event')
    .eq('manifest_id', manifestId)
    .neq('status', 'Confirmed');
  if (err2) { console.error('Souls error:', err2); return; }

  let md = "# Souls Won by Event\n\nBelow is the summary of the total souls won across the various recorded ministry events:\n\n| Event Date | Event Name | Total Souls Won |\n|---|---|---|\n";
  
  const sortedEvents = events.sort((a,b) => new Date(b.date) - new Date(a.date));
  
  for (const event of sortedEvents) {
    const eventSouls = souls.filter(s => s.source_id === event.id);
    md += `| ${event.date || 'N/A'} | ${event.title} | ${eventSouls.length} |\n`;
  }

  console.log(md);
}

run();
