
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';

export const inspect = async () => {
    const { data, error } = await supabase.from('members').select('*').limit(1);
    if (error) {
        console.error(error);
        process.exit(1);
    }
    if (data && data.length > 0) {
        fs.writeFileSync('member_sample.json', JSON.stringify(data[0], null, 2));
        console.log('Sample record written to member_sample.json');
    } else {
        console.log('No members found.');
    }
    process.exit(0);
};

inspect();
