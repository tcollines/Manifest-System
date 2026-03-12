import { supabase } from './src/supabase';

async function check() {
    const sql = `
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_name IN ('school_outreach_reports', 'campus_activities', 'campus_finance_records')
    AND column_name = 'event_id';
    `;

    try {
        // Many Supabase setups have an rpc called 'exec_sql' or similar for this
        // But let's try a direct query if we can, or just select from the tables
        console.log("Checking columns via REST API...");

        const { data: school, error: schoolErr } = await supabase.from('school_outreach_reports').select('event_id').limit(1);
        console.log("school_outreach_reports event_id exists?", !schoolErr);
        if (schoolErr) console.error("School Err:", schoolErr.message);

        const { data: campus, error: campusErr } = await supabase.from('campus_activities').select('event_id').limit(1);
        console.log("campus_activities event_id exists?", !campusErr);
        if (campusErr) console.error("Campus Err:", campusErr.message);

        const { data: finance, error: financeErr } = await supabase.from('campus_finance_records').select('event_id').limit(1);
        console.log("campus_finance_records event_id exists?", !financeErr);
        if (financeErr) console.error("Finance Err:", financeErr.message);

    } catch (e) {
        console.error("Error:", e);
    }
}

check();
