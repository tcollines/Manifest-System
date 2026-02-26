
// @ts-nocheck
import { supabase } from '../src/supabase';

export const check = async () => {
    const { data, error } = await supabase.from('members').select('*').limit(1);
    if (error) {
        console.error(error);
        process.exit(1);
    }
    if (data && data.length > 0) {
        console.log('--- COLUMNS ---');
        Object.keys(data[0]).sort().forEach(k => {
            if (k >= 'g') console.log(k);
        });
        console.log('--- END COLUMNS ---');
    } else {
        console.log('No members found.');
    }
    process.exit(0);
};

check();
