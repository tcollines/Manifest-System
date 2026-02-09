
// @ts-nocheck
import { supabase } from '../src/supabase';

export const audit = async () => {
    console.log('--- SHORT AUDIT ---');

    // 1. Get 10 valid Legacy IDs
    const { data: members } = await supabase.from('members').select('legacy_id').not('legacy_id', 'is', null).limit(10);
    console.log('VALID LEGACY IDs:', members?.map(m => m.legacy_id));

    // 2. Get 10 broken Attendance Member IDs
    // Fetch all members IDs for set
    const { data: allMembers } = await supabase.from('members').select('id');
    const validIds = new Set(allMembers?.map(m => m.id));

    let broken = [];
    let page = 0;
    while (broken.length < 10) {
        const { data: att } = await supabase.from('service_attendance').select('member_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (!att || att.length === 0) break;

        for (const a of att) {
            if (!validIds.has(a.member_id)) {
                if (!broken.includes(a.member_id)) broken.push(a.member_id);
            }
        }
        page++;
        if (page > 50) break;
    }
    console.log('BROKEN IDs:', broken);
    process.exit(0);
};

audit();
