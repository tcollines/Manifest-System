
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOrphans() {
    console.log('--- Phase 3C: Fixing Hardening Orphans (Comprehensive) ---\n');

    // 1. Resolve Fallback Event
    const { data: events, error: eventError } = await supabase.from('ministry_events').select('id, title').limit(5);
    if (eventError || !events || events.length === 0) {
        console.error('Fatal: No events found!');
        return;
    }
    const fallbackEventId = events[0].id;
    console.log(`Using fallback Event: ${events[0].title} (${fallbackEventId})`);

    // 2. Resolve Fallback Station
    const { data: stations } = await supabase.from('pickup_stations').select('id, name').limit(1);
    const fallbackStationId = stations?.[0]?.id || null;
    console.log(`Using fallback Station: ${stations?.[0]?.name || 'N/A'}`);

    const REPAIRS = [
        { table: 'pickup_stations', column: 'event_id', fallback: fallbackEventId },
        { table: 'vehicles', column: 'event_id', fallback: fallbackEventId },
        { table: 'vehicles', column: 'station_id', fallback: fallbackStationId },
        { table: 'passengers', column: 'event_id', fallback: fallbackEventId },
        { table: 'passengers', column: 'vehicle_id', fallback: null }, // Critical: will check if we can resolve from legacy
        { table: 'souls', column: 'event_id', fallback: fallbackEventId }
    ];

    for (const repair of REPAIRS) {
        const { data: orphans } = await supabase
            .from(repair.table)
            .select('*')
            .is(repair.column, null);

        if (!orphans || orphans.length === 0) {
            console.log(`[OK] ${repair.table}.${repair.column} is clean.`);
            continue;
        }

        console.log(`[!] Fixing ${orphans.length} orphans in ${repair.table}.${repair.column}...`);

        for (const record of orphans) {
            let updateValue = repair.fallback;

            // Smart resolution for passengers
            if (repair.table === 'passengers' && repair.column === 'vehicle_id' && record.legacy_vehicle_id) {
                const { data: parent } = await supabase
                    .from('vehicles')
                    .select('id')
                    .or(`id.eq.${record.legacy_vehicle_id},legacy_id.eq.${record.legacy_vehicle_id}`)
                    .maybeSingle();
                if (parent) updateValue = parent.id;
            }

            if (updateValue) {
                await supabase.from(repair.table).update({ [repair.column]: updateValue }).eq('id', record.id);
            }
        }
    }

    console.log('\nRepair Complete.');
}

fixOrphans();
