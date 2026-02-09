import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function deepAudit() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378
    console.log(`Deep Auditing attendance for S378 (UUID: ${serviceId})...`);

    // 1. Fetch ALL attendance for this service
    const { data: attendance, error } = await supabase
        .from('service_attendance')
        .select('member_id')
        .eq('service_id', serviceId);

    if (error) { console.error(error); return; }
    console.log(`Total attendance records: ${attendance.length}`);

    const allIds = attendance.map(a => a.member_id);
    const distinctIds = Array.from(new Set(allIds));
    console.log(`Distinct Member IDs: ${distinctIds.length}`);

    // 2. Check existence in batches
    let foundRecords: any[] = [];
    const BATCH_SIZE = 500;
    for (let i = 0; i < distinctIds.length; i += BATCH_SIZE) {
        const batch = distinctIds.slice(i, i + BATCH_SIZE);
        const { data } = await supabase.from('members').select('id, name, category').in('id', batch);
        if (data) foundRecords = foundRecords.concat(data);
    }

    console.log(`Members found in database: ${foundRecords.length}`);

    const foundSet = new Set(foundRecords.map(m => m.id));
    const missingIds = distinctIds.filter(id => !foundSet.has(id));

    console.log(`Orphaned IDs: ${missingIds.length}`);
    if (missingIds.length > 0) {
        console.log('Sample missing IDs (first 5):', missingIds.slice(0, 5));
    }

    const categoryCount: Record<string, number> = {};
    foundRecords.forEach(m => {
        categoryCount[m.category] = (categoryCount[m.category] || 0) + 1;
    });
    console.log('Categories for found members:', categoryCount);
}

deepAudit();
