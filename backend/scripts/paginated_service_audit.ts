import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function paginatedAudit() {
    console.log('--- PAGINATED ATTENDANCE AUDIT ---');

    let allServiceIds: string[] = [];
    let hasMore = true;
    let offset = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from('service_attendance')
            .select('service_id')
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) { console.error(error); break; }
        if (!data || data.length === 0) { hasMore = false; break; }

        allServiceIds = allServiceIds.concat(data.map(d => d.service_id));
        offset += PAGE_SIZE;
        if (offset % 5000 === 0) console.log(`  Fetched ${offset} records...`);
    }

    console.log(`Total records fetched: ${allServiceIds.length}`);

    const counts: Record<string, number> = {};
    allServiceIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let output = `Paginated Distribution Audit (${new Date().toISOString()})\n`;
    output += `Total Attendance Records: ${allServiceIds.length}\n\n`;
    sorted.forEach(([id, count]) => {
        output += `${id}: ${count}\n`;
    });

    fs.writeFileSync('d:/Manifest System/backend/scripts/paginated_service_counts.txt', output);
    console.log('Result saved to d:/Manifest System/backend/scripts/paginated_service_counts.txt');
}

paginatedAudit();
