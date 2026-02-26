import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function verifyOrphanMapping() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    const ids = Array.from(new Set(att?.map(a => a.member_id)));
    const { data: mems } = await supabase.from('members').select('id').in('id', ids);
    const memSet = new Set(mems?.map(m => m.id));
    const orphans = ids.filter(id => !memSet.has(id));

    console.log(`Verifying first 10 of ${orphans.length} orphans...`);

    const mappingPath = 'd:/Manifest System/backend/migration_mapping.json';
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    const newToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => newToLegacy[m.new_id] = m.legacy_id);

    orphans.slice(0, 10).forEach(id => {
        console.log(`Orphan: ${id} -> Legacy: ${newToLegacy[id] || 'NOT FOUND'}`);
    });
}

verifyOrphanMapping();
