import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function auditS378() {
    const serviceId = 'S378';
    console.log(`Auditing attendance for Service: ${serviceId}`);

    // 1. Fetch all attendance for S378
    const { data: attendance, error: aErr } = await supabase
        .from('service_attendance')
        .select('member_id')
        .eq('service_id', serviceId);

    if (aErr) { console.error(aErr); return; }
    console.log(`Total records in service_attendance for ${serviceId}: ${attendance.length}`);

    if (attendance.length === 0) return;

    // 2. Fetch member details for these IDs
    const memberIds = attendance.map(a => a.member_id);

    // Fetch in batches
    let memberDetails: any[] = [];
    const BATCH_SIZE = 500;
    for (let i = 0; i < memberIds.length; i += BATCH_SIZE) {
        const batch = memberIds.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
            .from('members')
            .select('id, name, category, attended_service_ids')
            .in('id', batch);
        if (data) memberDetails = memberDetails.concat(data);
    }

    console.log(`Fetched details for ${memberDetails.length} members.`);

    // 3. Categorize
    const categories: Record<string, number> = {};
    memberDetails.forEach(m => {
        categories[m.category] = (categories[m.category] || 0) + 1;
    });

    console.log('Category Breakdown:');
    console.log(JSON.stringify(categories, null, 2));

    // 4. Check for Orphans (IDs in attendance but NOT in members table)
    const detailIds = new Set(memberDetails.map(m => m.id));
    const orphans = memberIds.filter(id => !detailIds.has(id));
    console.log(`Orphaned IDs (in attendance but missing in members table): ${orphans.length}`);
    if (orphans.length > 0) {
        console.log('First 5 orphans:', orphans.slice(0, 5));
    }
}

auditS378();
