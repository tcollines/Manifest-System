
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';

export const findDups = async () => {
    console.log('--- GLOBAL DUPLICATE SEARCH ---');

    let all: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('members').select('id, name, phone, category, residency, attended_service_ids').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        all = all.concat(data);
        page++;
    }
    console.log(`Total Members Loaded: ${all.length}`);

    const map = new Map();
    const dups: any[] = [];

    all.forEach(m => {
        // Use phone_last9 ONLY
        const key = m.phone_last9;
        if (!key || key === 'unknown') return;

        if (map.has(key)) {
            dups.push({
                original: map.get(key),
                duplicate: m
            });
        } else {
            map.set(key, m);
        }
    });

    console.log(`Duplicates Found: ${dups.length}`);

    if (dups.length > 0) {
        const csv = dups.map(d => `${d.original.id},${d.original.name},${d.original.phone},${d.duplicate.id},${d.duplicate.name},${d.duplicate.phone}`).join('\n');
        fs.writeFileSync('d:/Manifest System/backend/scripts/duplicates_global.csv', 'original_id,original_name,original_phone,duplicate_id,duplicate_name,duplicate_phone\n' + csv);
        console.log('Global duplicates written to d:/Manifest System/backend/scripts/duplicates_global.csv');
    }

    process.exit(0);
};

findDups();
