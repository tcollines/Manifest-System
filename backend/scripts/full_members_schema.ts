
// @ts-nocheck
import { supabase } from '../src/supabase';

export const fullSchemaCheck = async () => {
    console.log('--- FULL MEMBERS SCHEMA CHECK ---');
    const { data, error } = await supabase.from('members').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        columns.forEach(col => console.log(col));
    } else {
        console.log('No data in members table.');
    }
    process.exit(0);
};

fullSchemaCheck();
