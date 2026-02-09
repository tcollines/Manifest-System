
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';

export const sample = async () => {
    // Fetch all Valid Member IDs
    let validMemberIds = new Set();
    let page = 0;
    const pageSize = 1000;
    while (true) {
        const { data, error } = await supabase.from('members').select('id').range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        data.forEach(m => validMemberIds.add(m.id));
        page++;
        if (data.length < pageSize) break;
    }

    // Fetch samples of broken rows
    const { data: attendance, error } = await supabase.from('service_attendance').select('*').limit(2000);

    const broken = attendance.filter(a => !validMemberIds.has(a.member_id));

    console.log(`Found ${broken.length} broken rows in first 2000.`);

    const nonUuid = broken.filter(a => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.member_id));
    console.log(`Non-UUID broken rows: ${nonUuid.length}`);
    if (nonUuid.length > 0) {
        console.log('Sample Legacy IDs:', nonUuid.slice(0, 10).map(n => n.member_id));
    }

    const uuidBroken = broken.filter(a => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.member_id));
    console.log(`UUID broken rows: ${uuidBroken.length}`);
    if (uuidBroken.length > 0) {
        console.log('Sample UUID broken IDs:', uuidBroken.slice(0, 10).map(n => n.member_id));
    }

    process.exit(0);
};

sample();
