import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function definitiveVerify() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    let output = '# Final Verification Report\n\n';

    // 1. S378 Stats
    const { count: uuidCount } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', uuid);
    const { count: legacyCount } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', 'S378');

    output += `## Attendance Counts for S378\n- UUID Count: ${uuidCount}\n- Legacy ('S378') Count: ${legacyCount}\n\n`;

    // 2. Member Matches for UUID
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', uuid);
    const ids = Array.from(new Set(att?.map(a => a.member_id) || []));

    let found = 0;
    const CHUNK = 50;
    for (let i = 0; i < ids.length; i += CHUNK) {
        const { data } = await supabase.from('members').select('id').in('id', ids.slice(i, i + CHUNK));
        found += data?.length || 0;
    }

    output += `## ID Integrity\n- Unique Member IDs in attendance: ${ids.length}\n- Found in members table: ${found}\n- orphans: ${ids.length - found}\n\n`;

    // 3. Arthur Status
    const { data: arthur } = await supabase.from('members').select('*').ilike('name', '%MWONDHA ARTHUR%').single();
    if (arthur) {
        const { count: artAtt } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('member_id', arthur.id);
        output += `## Member: Mwondha Arthur\n- ID: ${arthur.id}\n- Category: ${arthur.category}\n- Joined Date: ${arthur.joined_date}\n- Total Attendance Records: ${artAtt}\n\n`;
    } else {
        output += `## Member: Mwondha Arthur\n- NOT FOUND IN DATABASE\n\n`;
    }

    // 4. Sample ID check
    const { data: samples } = await supabase.from('members').select('id').limit(5);
    output += `## Sample ID Lengths\n`;
    samples?.forEach(s => {
        output += `- ${s.id} (Length: ${s.id.length})\n`;
    });

    fs.writeFileSync('d:/Manifest System/backend/scripts/final_audit_results.md', output);
    console.log('Results written to d:/Manifest System/backend/scripts/final_audit_results.md');
}

definitiveVerify();
