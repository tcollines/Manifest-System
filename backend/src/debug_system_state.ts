
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Force load .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''; // Service role to bypass RLS for check
const supabase = createClient(supabaseUrl, supabaseKey);

const debugState = async () => {
    console.log("--- SYSTEM STATE DIAGNOSTIC ---");
    console.log("URL:", supabaseUrl);

    // 1. Check Members
    const { count: membersCount, error: membersError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

    if (membersError) console.error("❌ Members Check Error:", membersError);
    else console.log(`✅ Members Count: ${membersCount}`);

    // 2. Check Events (ministry_events based on typical schema, will verify from controller file)
    // Looking at file list/previous context, likely 'ministry_events' or 'events'
    // I will try 'ministry_events' first.
    let { count: eventsCount, error: eventsError } = await supabase
        .from('ministry_events')
        .select('*', { count: 'exact', head: true });

    if (eventsError) {
        // Try 'events' ?
        const { count: eventsCount2, error: eventsError2 } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true });

        if (eventsError2) {
            console.error("❌ Events Check Error (tried ministry_events and events):", eventsError, eventsError2);
        } else {
            console.log(`✅ Events Count (table: events): ${eventsCount2}`);
        }
    } else {
        console.log(`✅ Events Count (table: ministry_events): ${eventsCount}`);
    }

    // 3. Check Recent Members (to see if data is readable)
    const { data: recent, error: recentError } = await supabase
        .from('members')
        .select('id, name, created_at')
        .limit(3);

    if (recentError) console.error("❌ Read Recent Members Error:", recentError);
    else console.log("✅ Recent Members Sample:", recent);
};

debugState();
