
// @ts-nocheck
import { supabase } from '../src/supabase';

export const check = async () => {
    const { count: attCount } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true });
    const { count: memCount } = await supabase.from('members').select('*', { count: 'exact', head: true });

    console.log(`Total Attendance Rows: ${attCount}`);
    console.log(`Total Member Rows: ${memCount}`);
    process.exit(0);
};

check();
