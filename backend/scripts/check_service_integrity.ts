
// @ts-nocheck
import { supabase } from '../src/supabase';

export const checkServiceIds = async () => {
    console.log('--- CHECKING SERVICE_ID INTEGRITY ---');

    // 1. Get all events
    const { data: events } = await supabase.from('ministry_events').select('id');
    const eventSet = new Set(events.map(e => e.id));
    console.log(`Events Loaded: ${eventSet.size}`);

    // 2. Scan Attendance
    let page = 0;
    let orphans = 0;
    while (true) {
        const { data } = await supabase.from('service_attendance').select('service_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        data.forEach(r => {
            if (!eventSet.has(r.service_id)) {
                orphans++;
                if (orphans <= 5) console.log(`Orphan Service ID: ${r.service_id}`);
            }
        });
        page++;
    }
    console.log(`Total Orphan Service IDs: ${orphans}`);
    process.exit(0);
};

checkServiceIds();
