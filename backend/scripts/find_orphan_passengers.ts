import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findOrphanPassengers() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Get orphans
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', uuid);
    const ids = Array.from(new Set(att?.map(a => a.member_id) || []));

    const orphans: string[] = [];
    const CHUNK = 50;
    for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { data } = await supabase.from('members').select('id').in('id', chunk);
        const existing = new Set(data?.map(m => m.id));
        chunk.forEach(id => {
            if (!existing.has(id)) orphans.push(id);
        });
    }

    console.log(`Searching passengers for ${orphans.length} orphans...`);

    let foundCount = 0;
    let output = '# Orphan Passenger Data\n\n';

    for (let i = 0; i < orphans.length; i += CHUNK) {
        const chunk = orphans.slice(i, i + CHUNK);
        const { data } = await supabase.from('passengers').select('*').in('id', chunk);

        if (data && data.length > 0) {
            foundCount += data.length;
            data.forEach(p => {
                output += `- ID: ${p.id}\n`;
                output += `  - Name: ${p.name}\n`;
                output += `  - Phone: ${p.contact}\n`;
                output += `  - Residence: ${p.residency}\n\n`;
            });
        }
    }

    console.log(`Found ${foundCount} / ${orphans.length} matches in passengers table.`);
    fs.writeFileSync('d:/Manifest System/backend/scripts/orphan_passengers.md', output);
}

findOrphanPassengers();
