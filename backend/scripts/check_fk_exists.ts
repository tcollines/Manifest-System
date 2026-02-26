
import { supabase } from '../src/supabase';

async function checkFK() {
    console.log('Checking for constraint fk_service_attendance_member_id...');

    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT conname 
            FROM pg_constraint 
            WHERE conname = 'fk_service_attendance_member_id';
        `
    });

    if (error) {
        console.error('Check failed:', error);
    } else {
        console.log('Result:', data);
        if (Array.isArray(data) && data.length > 0) {
            console.log('✅ Constraint EXISTS.');
        } else {
            console.log('❌ Constraint MISSING.');
        }
    }
}

checkFK().catch(console.error);
