import { supabase } from '../src/supabase';

async function cleanupStaleFirstTimers() {
    console.log('Starting Cleanup of Stale First Timers...');

    // 1. Identify members with category 'First Timer' joined before February 2026
    const { data: stale, error } = await supabase
        .from('members')
        .select('id, name, joined_date')
        .eq('category', 'First Timer')
        .lt('joined_date', '2026-02-01');

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    if (!stale || stale.length === 0) {
        console.log('No stale first timers found.');
        return;
    }

    console.log(`Found ${stale.length} stale records. Promoting to 'Member'...`);

    const ids = stale.map(m => m.id);

    // Batch update to 'Member'
    const { error: updateErr } = await supabase
        .from('members')
        .update({ category: 'Member' })
        .in('id', ids);

    if (updateErr) {
        console.error('Update error:', updateErr);
    } else {
        console.log(`Successfully promoted ${stale.length} members.`);
    }
}

cleanupStaleFirstTimers();
