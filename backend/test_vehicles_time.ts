import { supabase } from './src/supabase';

async function measure() {
    const { data: events } = await supabase.from('ministry_events').select('id, manifest_id, legacy_id').eq('title', 'MEN GATHER IX').limit(1);
    const event = events[0];

    const vStart = performance.now();
    await supabase.from('vehicles').select('*').eq('manifest_id', event.manifest_id).or(`event_id.eq.${event.id},legacy_event_id.eq.${event.legacy_id || event.id}`);
    const vEnd = performance.now();

    const pStart = performance.now();
    await supabase.from('passengers').select('*').eq('manifest_id', event.manifest_id).or(`event_id.eq.${event.id},legacy_event_id.eq.${event.legacy_id || event.id}`);
    const pEnd = performance.now();

    const sStart = performance.now();
    await supabase.from('pickup_stations').select('*').eq('manifest_id', event.manifest_id).or(`event_id.eq.${event.id},legacy_event_id.eq.${event.legacy_id || event.id}`);
    const sEnd = performance.now();

    console.log(JSON.stringify({
        vehicles_ms: vEnd - vStart,
        passengers_ms: pEnd - pStart,
        stations_ms: sEnd - sStart,
        total_ms: (vEnd - vStart) + (pEnd - pStart) + (sEnd - sStart)
    }, null, 2));
}
measure();
