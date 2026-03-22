require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAttendanceFinal() {
    try {
        const { data: events, error } = await supabase
            .from('ministry_events')
            .select('id, title, date, description, service_number')
            .eq('type', 'Service')
            .order('date', { ascending: true });

        if (error) throw error;
        
        console.log(`Found ${events?.length || 0} events.`);

        const chartDataPromises = (events || []).map(async (event) => {
            if (!event.date) return null;

            const { data: highlights, error: rpcError } = await supabase
                .rpc('get_event_highlights', { v_event_id: event.id });

            if (rpcError) {
                console.error(`RPC Error for event ${event.id}:`, rpcError);
                return null;
            }

            const date = new Date(event.date);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return {
                name: formattedDate,
                title: event.title,
                description: event.description,
                serviceNumber: event.service_number,
                value: highlights?.attendees || 0,
                fullDate: event.date
            };
        });

        const results = await Promise.all(chartDataPromises);
        const chartData = results.filter(item => item !== null);
        console.log("Final chart data length:", chartData.length);
        console.log("First element:", chartData[0]);
    } catch (e) {
        console.error("Crash:", e);
    }
}
testAttendanceFinal();
