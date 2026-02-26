import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function fullAudit() {
    const { data: all } = await supabase.from('service_attendance').select('service_id');
    const counts: Record<string, number> = {};
    all?.forEach(a => counts[a.service_id] = (counts[a.service_id] || 0) + 1);

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let output = 'Service ID Counts:\n';
    sorted.forEach(([id, count]) => {
        output += `${id}: ${count}\n`;
    });

    fs.writeFileSync('d:/Manifest System/backend/scripts/full_service_counts.txt', output);
    console.log('Written to d:/Manifest System/backend/scripts/full_service_counts.txt');
}

fullAudit();
