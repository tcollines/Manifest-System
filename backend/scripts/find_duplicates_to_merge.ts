import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findDuplicates() {
    console.log('Finding duplicates based on (name_norm, phone_last9, residency_norm)...');

    const allMembers: any[] = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('members')
            .select('name_norm, phone_last9, residency_norm, id, name, phone')
            .range(page * 1000, (page + 1) * 1000 - 1)
            .order('name_norm');

        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        allMembers.push(...data);
        page++;
    }

    const data = allMembers;

    const groups: Record<string, any[]> = {};
    data.forEach(m => {
        const key = `${m.name_norm}|${m.phone_last9}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    });

    const duplicates = Object.entries(groups).filter(([key, members]) => members.length > 1);

    console.log(`Total Unique Identity Groups: ${Object.keys(groups).length}`);
    console.log(`Groups with Duplicates: ${duplicates.length}`);

    let totalRowsInDuplicates = 0;
    duplicates.forEach(([key, members]) => {
        totalRowsInDuplicates += members.length;
        if (duplicates.length < 20) {
            console.log(`Group [${key}]: ${members.length} members`);
        }
    });

    console.log(`Total duplicate rows to merge: ${totalRowsInDuplicates}`);
}

findDuplicates();
