
// @ts-nocheck
import { supabase } from '../src/supabase';

export const check = async () => {
    const { count, error } = await supabase.from('legacy_id_mapping').select('*', { count: 'exact', head: true });
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`legacy_id_mapping Count: ${count}`);
        if (count > 0) {
            const { data } = await supabase.from('legacy_id_mapping').select('*').limit(1);
            console.log('Sample Row:', data[0]);
        }
    }
    process.exit(0);
};

check();
