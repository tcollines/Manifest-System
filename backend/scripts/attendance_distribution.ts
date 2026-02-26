import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function distribution() {
    console.log('Fetching service attendance distribution...');

    const { data, error } = await supabase.from('service_attendance').select('service_id');
    if (error) { console.error(error); return; }

    const counts: Record<string, number> = {};
    data?.forEach(d => {
        counts[d.service_id] = (counts[d.service_id] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    console.log('Top 20 Services by Attendance:');
    sorted.slice(0, 20).forEach(([id, count]) => {
        console.log(`- ${id}: ${count} records`);
    });

    console.log(`\nTotal Unique Services with Attendance: ${sorted.length}`);

    // Check for any service_id that is NOT a UUID
    const nonUuid = sorted.filter(([id]) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
    console.log(`Non-UUID Service IDs: ${nonUuid.length}`);
    if (nonUuid.length > 0) {
        console.log('Sample Non-UUIDs:', nonUuid.slice(0, 5));
    }
}

distribution();
