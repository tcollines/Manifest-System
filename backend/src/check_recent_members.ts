import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const checkRecent = async () => {
    console.log("--- CHECKING RECENT MEMBERS ---");

    // Get last 5 members
    const { data: members, error: mError } = await supabase
        .from('members')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (mError) {
        console.error("Error fetching members:", mError);
        return;
    }

    console.log("Recent Members found:", members?.length);
    if (!members || members.length === 0) {
        console.log("No members found.");
        return;
    }

    for (const m of members) {
        // Check attendance for this member
        const { data: attendance, error: aError } = await supabase
            .from('service_attendance')
            .select('service_id, check_in_time')
            .eq('member_id', m.id);

        console.log(`- Member: ${m.name} (ID: ${m.id})`);
        if (aError) {
            console.error(`  Error checking attendance: ${aError.message}`);
        } else if (attendance && attendance.length > 0) {
            console.log(`  -> Checked In to Services: ${attendance.length}`);
            attendance.forEach(a => console.log(`     Service ID: ${a.service_id}`));
        } else {
            console.log(`  -> ⚠️ NO CHECK-INS FOUND `);
        }
    }
};

checkRecent();
