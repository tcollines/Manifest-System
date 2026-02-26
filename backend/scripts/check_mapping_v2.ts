
// @ts-nocheck
import { supabase } from '../src/supabase';

export const check = async () => {
    const { count, error } = await supabase.from('legacy_id_mapping').select('*', { count: 'exact', head: true });
    if (error) {
        console.log('Table error:', error.message);
    } else {
        console.log('CHECK:COUNT:' + count);
    }
    process.exit(0);
};

check();
