import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findDuplicates() {
    console.log('Final Global Duplicate Audit...');

    let allMembers: any[] = [];
    let lastId = '';
    let hasMore = true;
    const PAGE_SIZE = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from('members')
            .select('id, name_norm, phone_last9, residency_norm')
            .gt('id', lastId)
            .order('id')
            .limit(PAGE_SIZE);

        if (error) { console.error(error); break; }
        if (!data || data.length === 0) { hasMore = false; break; }

        allMembers = allMembers.concat(data);
        lastId = data[data.length - 1].id;
    }

    const groups: Record<string, any[]> = {};
    allMembers.forEach(m => {
        const key = `${m.name_norm}|${m.phone_last9}|${m.residency_norm}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    });

    const duplicates = Object.entries(groups).filter(([key, members]) => members.length > 1);

    console.log(`Total Members: ${allMembers.length}`);
    console.log(`Groups with Duplicates: ${duplicates.length}`);

    if (duplicates.length > 0) {
        console.log('REMAINING DUPLICATES:');
        duplicates.forEach(([key, members]) => {
            console.log(`- ${key}: ${members.length} members`);
        });
    } else {
        console.log('SUCCESS: Zero duplicates found.');
    }
}

findDuplicates();
