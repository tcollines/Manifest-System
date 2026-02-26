
// @ts-nocheck
import { supabase } from '../src/supabase';

export const search = async () => {
    const name = 'NAMUWENGE HOPE MARTHA';
    console.log(`--- SEARCHING NAME: ${name} ---`);
    const { data, error } = await supabase.from('members').select('*').ilike('name', `%${name}%`);
    if (error) {
        console.error(error);
    } else {
        console.log('Results:', data);
    }
    process.exit(0);
};

search();
