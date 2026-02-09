import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function verifyAttendance() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Get all attendance for S378
    const { data: attendance } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    if (!attendance) {
        console.log('No attendance found for S378');
        return;
    }

    const memberIds = attendance.map(a => a.member_id);
    console.log(`Total attendance records: ${memberIds.length}`);

    // 2. Check how many exist in members table
    const { data: members } = await supabase.from('members').select('id').in('id', memberIds);
    console.log(`Matching members found: ${members?.length || 0}`);

    if (members && members.length < memberIds.length) {
        const existingSet = new Set(members.map(m => m.id));
        const missing = memberIds.filter(id => !existingSet.has(id));
        console.log(`Sample Missing IDs (first 5):`, missing.slice(0, 5));

        // Check if these missing IDs are in the migration mapping
        const fs = require('fs');
        const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));
        const mappingSet = new Set(mapping.map((m: any) => m.new_id));
        const missingInMapping = missing.filter(id => mappingSet.has(id));
        console.log(`Number of missing IDs that ARE in migration mapping: ${missingInMapping.length}`);
    }
}

verifyAttendance();
