
// @ts-nocheck
import { supabase } from '../src/supabase';

const BAD_ID = 'd3fe5924-f8d4-4c66-bf9e-14057a5941d6';

export const search = async () => {
    console.log(`--- SEARCHING ID: ${BAD_ID} IN SOULS ---`);
    const { data, error } = await supabase.from('souls').select('*').or(`captured_by.eq.${BAD_ID},invited_by->>id.eq.${BAD_ID}`);
    if (error) {
        console.error(error);
    } else {
        console.log('Souls found:', data.length);
        if (data.length > 0) {
            console.log('Sample Soul:', data[0]);
        }
    }
    process.exit(0);
};

search();
