import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function inspectOrphans() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378
    console.log(`Inspecting orphan metadata for S378...`);

    const { data, error } = await supabase
        .from('service_attendance')
        .select('*')
        .eq('service_id', serviceId)
        .limit(10);

    if (error) { console.error(error); return; }

    data?.forEach((row, i) => {
        console.log(`Row ${i + 1}:`, JSON.stringify(row, null, 2));
    });
}

inspectOrphans();
