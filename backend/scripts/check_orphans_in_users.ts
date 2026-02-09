
// @ts-nocheck
import { supabase } from '../src/supabase';

export const checkUsers = async () => {
    console.log('--- SEARCHING USERS FOR ORPHANS ---');

    // 1. Get orphans
    const { data: attendance } = await supabase.from('service_attendance').select('member_id');
    const { data: members } = await supabase.from('members').select('id');
    const memberSet = new Set(members.map(m => m.id));
    const orphans = Array.from(new Set(attendance.filter(a => !memberSet.has(a.member_id)).map(a => a.member_id)));
    console.log(`Searching for ${orphans.length} orphans in users...`);

    // 2. Search in users.id
    let found = 0;
    for (let i = 0; i < orphans.length; i += 100) {
        const batch = orphans.slice(i, i + 100);
        const { data } = await supabase.from('users').select('id, name, email').in('id', batch);
        if (data && data.length > 0) {
            found += data.length;
            console.log(`Found ${data.length} in users! Example: ${data[0].name}`);
        }
    }

    console.log(`TOTAL FOUND IN USERS: ${found}`);
    process.exit(0);
};

checkUsers();
