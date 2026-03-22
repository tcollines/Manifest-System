require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testTime() {
    console.time("Query execution");
    const { data: events, error } = await supabase
        .from('ministry_events')
        .select('id, title, date, description, service_number')
        .eq('type', 'Service')
        .order('date', { ascending: true });

    const chartDataPromises = (events || []).map(async (event) => {
        if (!event.date) return null;
        await supabase.rpc('get_event_highlights', { v_event_id: event.id });
    });

    await Promise.all(chartDataPromises);
    console.timeEnd("Query execution");
}
testTime();
