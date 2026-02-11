
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function compareReporting() {
    console.log('--- Stage 2B: Reporting Consistency Audit (Legacy vs UUID) ---\n');

    // 1. Fetch some recent events
    const { data: events } = await supabase
        .from('ministry_events')
        .select('id, id_uuid, title')
        .not('id_uuid', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

    if (!events || events.length === 0) {
        console.log('No UUID-mapped events found for comparison.');
        return;
    }

    for (const event of events) {
        console.log(`Event: ${event.title} (${event.id})`);

        // A. Service Attendance Comparison
        const { count: legacyCount } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', event.id);

        const { count: uuidCount } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('service_id_uuid', event.id_uuid);

        const attendanceMatch = legacyCount === uuidCount;
        console.log(`  - Attendance: Legacy=${legacyCount}, UUID=${uuidCount} [${attendanceMatch ? '✅ MATCH' : '❌ DISCREPANCY'}]`);

        // B. Station Comparison
        const { count: legacyStations } = await supabase
            .from('pickup_stations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

        const { count: uuidStations } = await supabase
            .from('pickup_stations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id_uuid', event.id_uuid);

        const stationsMatch = legacyStations === uuidStations;
        console.log(`  - Stations: Legacy=${legacyStations}, UUID=${uuidStations} [${stationsMatch ? '✅ MATCH' : '❌ DISCREPANCY'}]`);

        // C. RPC Comparison (Directly call the updated RPC)
        const { data: highlights, error: hError } = await supabase.rpc('get_event_highlights', { event_uuid: event.id_uuid });
        if (hError) {
            console.error(`  - Highlights RPC Error: ${hError.message}`);
        } else {
            console.log(`  - Highlights RPC: Attendees=${highlights.attendees}, Souls=${highlights.soulsWon}, FirstTimers=${highlights.firstTimers}`);
        }

        console.log('');
    }
}

compareReporting();
