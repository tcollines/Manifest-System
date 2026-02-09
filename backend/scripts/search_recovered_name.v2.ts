
// @ts-nocheck
import { supabase } from '../src/supabase';

export const search = async () => {
    const name = 'NAMUWENGE HOPE MARTHA';
    const { data } = await supabase.from('members').select('id, name').ilike('name', `%${name}%`);
    console.log('Results:', data);
    process.exit(0);
};

search();
