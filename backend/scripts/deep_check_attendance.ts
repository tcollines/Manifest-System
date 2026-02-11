
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepCheck() {
    console.log('--- Deep Check Attendance S378 ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    const { data: attendance, error } = await supabase
        .from('service_attendance')
        .select('member_id, check_in_time')
        .eq('service_id', serviceId);

    if (error || !attendance) {
        console.error('Error:', error?.message);
        return;
    }

    const memberIds = attendance.map(a => a.member_id);
    const filter1970 = (attendance || []).filter(a => a.check_in_time?.startsWith('1970-01-01')).length;

    console.log(`Total Attendance Records: ${memberIds.length}`);
    console.log(`Records with 1970-01-01 (Filtered): ${filter1970}`);
    console.log(`Valid Records: ${memberIds.length - filter1970}`);
    console.log(`Sample check_in_times:`, attendance.slice(0, 5).map(a => a.check_in_time));

    // Check in chunks to avoids URI length limits in query
    let foundCount = 0;
    const chunkSize = 100;
    for (let i = 0; i < memberIds.length; i += chunkSize) {
        const chunk = memberIds.slice(i, i + chunkSize);
        const { data: members } = await supabase
            .from('members')
            .select('id')
            .in('id', chunk);

        foundCount += members?.length || 0;
    }

    console.log(`Members found in 'members' table: ${foundCount}`);
}

deepCheck();
