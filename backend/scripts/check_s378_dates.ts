
// @ts-nocheck
import { supabase } from '../src/supabase';

export const checkDates = async () => {
    console.log('--- Checking Date Distribution for S378 ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    try {
        const { data: attendance } = await supabase
            .from('service_attendance')
            .select('check_in_time')
            .eq('service_id', serviceId);

        if (!attendance) return;

        const dates = {};
        attendance.forEach(a => {
            if (!a.check_in_time) {
                dates['null'] = (dates['null'] || 0) + 1;
            } else {
                // Just the YYYY-MM-DD part
                const d = a.check_in_time.split('T')[0];
                dates[d] = (dates[d] || 0) + 1;
            }
        });

        console.log('---DATES---');
        Object.keys(dates).forEach(d => {
            console.log(`${d}:${dates[d]}`);
        });


    } catch (err: any) {
        console.error('Error:', err.message);
    }
    process.exit(0);
};

checkDates();
