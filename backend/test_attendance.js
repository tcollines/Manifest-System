require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAttendance() {
    try {
        console.log("Fetching services...");
        const { data: events, error } = await supabase
            .from('ministry_events')
            .select('id, title, date, description, service_number')
            .eq('type', 'Service')
            .order('date', { ascending: true });

        if (error) throw error;
        console.log("Found services amount:", events ? events.length : 0);
        
        if (events && events.length > 0) {
            console.log("First event date:", events[0].date);
        }

        const chartDataPromises = (events || []).map(async (event) => {
            const { data: highlights, error: rpcError } = await supabase
                .rpc('get_event_highlights', { v_event_id: event.id });
            
            if (rpcError) {
                console.error("RPC Error:", rpcError);
                return null;
            }
            return { event, highlights };
        });

        const results = await Promise.all(chartDataPromises);
        console.log("RPC Outputs length:", results.length);
        console.log("First result sample:", results[0]);
    } catch (e) {
        console.error("Error:", e);
    }
}
testAttendance();
