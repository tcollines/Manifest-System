require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function findEvents() {
    const { data: events, error } = await supabase
        .from('ministry_events')
        .select('id, title, type');
        
    if (error) {
        console.error("Error fetching events:", error);
        return;
    }
    
    console.log("Events:");
    for (const e of events) {
        console.log(`- ID: ${e.id} | Title: ${e.title} | Type: ${e.type}`);
    }
}

findEvents();
