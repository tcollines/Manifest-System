
// @ts-nocheck
import { supabase } from '../src/supabase';

export const countAtt = async () => {
    const { count, error } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true });
    console.log(`Total Attendance Records: ${count}`);
    if (error) console.error(error);
    process.exit(0);
};

countAtt();
