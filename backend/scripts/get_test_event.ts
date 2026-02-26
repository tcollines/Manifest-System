
import { supabase } from '../src/supabase';

async function getTestEvent() {
    const { data, error } = await supabase
        .from('ministry_events')
        .select('id, legacy_id')
        .not('legacy_id', 'is', null)
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Test Event:', JSON.stringify(data));
    }
}

getTestEvent();
