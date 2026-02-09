
// @ts-nocheck
import { supabase } from '../src/supabase';

export const schemaCheck = async () => {
    console.log('--- SCHEMA CHECK ---');

    // Fetch one row to see all props
    const { data, error } = await supabase.from('service_attendance').select('*').limit(1);
    if (error) console.error(error);

    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample Row:', data[0]);
    } else {
        console.log('No data found to infer schema.');
    }
    process.exit(0);
};

schemaCheck();
