import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function checkLegacyAttendance() {
    console.log('Checking for legacy IDs in service_attendance...');

    // Since member_id might be TEXT or UUID depending on the migration state
    // We'll just fetch a sample where it starts with 'm-'

    const { data, error } = await supabase
        .from('service_attendance')
        .select('member_id')
        .ilike('member_id', 'm-%')
        .limit(10);

    if (error) {
        console.error('Error checking legacy IDs:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} legacy IDs (sample):`, data.map(d => d.member_id));

        const { count } = await supabase
            .from('service_attendance')
            .select('*', { count: 'exact', head: true })
            .ilike('member_id', 'm-%');

        console.log(`Total legacy IDs in service_attendance: ${count}`);
    } else {
        console.log('No legacy IDs (m-*) found in service_attendance.');

        // Check for UUIDs that don't exist in members table
        console.log('Checking for orphaned UUIDs...');
        const { data: allAttendance } = await supabase.from('service_attendance').select('member_id').limit(1000);
        const uniqueIds = Array.from(new Set(allAttendance?.map(a => a.member_id)));

        const { data: matchedMembers } = await supabase.from('members').select('id').in('id', uniqueIds);
        const matchedSet = new Set(matchedMembers?.map(m => m.id));

        const orphaned = uniqueIds.filter(id => !matchedSet.has(id));
        console.log(`Orphaned IDs found in sample: ${orphaned.length}`);
        if (orphaned.length > 0) {
            console.log('Sample orphans:', orphaned.slice(0, 5));
        }
    }
}

checkLegacyAttendance();
