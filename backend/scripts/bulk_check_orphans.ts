import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function bulkCheckOrphans() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    console.log(`Fetching remaining orphans for S378...`);

    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    const ids = Array.from(new Set(att?.map(a => a.member_id)));

    const { data: mems } = await supabase.from('members').select('id').in('id', ids);
    const memSet = new Set(mems?.map(m => m.id));
    const orphans = ids.filter(id => !memSet.has(id));

    console.log(`Searching for ${orphans.length} orphans in migration_mapping.json...`);

    const mappingPath = 'd:/Manifest System/backend/migration_mapping.json';
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

    const newIdToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => {
        newIdToLegacy[m.new_id] = m.legacy_id;
    });

    const foundInMapping = orphans.filter(id => newIdToLegacy[id]);
    console.log(`Found ${foundInMapping.length} orphans in migration mapping.`);

    if (foundInMapping.length > 0) {
        console.log('Sample Legacy IDs:', foundInMapping.slice(0, 5).map(id => newIdToLegacy[id]));
    } else {
        console.log('NONE of the 798 orphans are in the migration mapping. They were likely NEW IDs created today.');
    }
}

bulkCheckOrphans();
