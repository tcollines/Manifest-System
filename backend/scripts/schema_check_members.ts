
// @ts-nocheck
import { supabase } from '../src/supabase';

export const schemaCheckMembers = async () => {
    console.log('--- MEMBERS SCHEMA CHECK ---');
    const { data, error } = await supabase.from('members').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('No data in members table.');
    }
    process.exit(0);
};

schemaCheckMembers();
