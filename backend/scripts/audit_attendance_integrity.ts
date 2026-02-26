import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function auditAttendance() {
    console.log('Auditing Service Attendance Integrity...');

    // 1. Total Count
    const { count: totalAttendance, error: countErr } = await supabase
        .from('service_attendance')
        .select('*', { count: 'exact', head: true });

    if (countErr) { console.error('Error fetching total count:', countErr); return; }
    console.log(`Total Attendance Records: ${totalAttendance}`);

    // 2. Check for legacy IDs (m-...) in attendance table
    // Since member_id is UUID type now, standard query might error if we search for string.
    // But let's check if there are any records where member_id doesn't exist in members table.
    const { data: orphans, error: orphanErr } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT COUNT(*) FROM service_attendance s LEFT JOIN members m ON s.member_id = m.id WHERE m.id IS NULL"
    });

    if (orphanErr) {
        console.warn('Exec_sql failed (likely cache). Searching via standard client for null joins...');
        // This is harder via standard client without a view, but we can check a sample.
    } else {
        console.log(`Orphaned Attendance Records (pointing to non-existent members): ${orphans?.[0]?.count || 0}`);
    }

    // 3. Cross-check Member Array vs Table
    console.log('Sampling members to verify attended_service_ids matches table...');
    const { data: samples, error: sampleErr } = await supabase
        .from('members')
        .select('id, name, attended_service_ids')
        .limit(10);

    if (sampleErr) { console.error(sampleErr); return; }

    for (const m of samples) {
        const { data: tableAttendance } = await supabase
            .from('service_attendance')
            .select('service_id')
            .eq('member_id', m.id);

        const arrayCount = m.attended_service_ids?.length || 0;
        const tableCount = tableAttendance?.length || 0;

        console.log(`Member: ${m.name} (${m.id})`);
        console.log(`  Array Count: ${arrayCount}`);
        console.log(`  Table Count: ${tableCount}`);

        if (arrayCount !== tableCount) {
            console.warn(`  !!! MISMATCH detected for ${m.name}`);
        }
    }
}

auditAttendance();
