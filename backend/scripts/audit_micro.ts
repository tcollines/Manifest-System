
// @ts-nocheck
import { supabase } from '../src/supabase';

export const microAudit = async () => {
    // 1. One Legacy ID
    const { data: m } = await supabase.from('members').select('legacy_id').not('legacy_id', 'is', null).limit(1);
    console.log(`LEGACY_SAMPLE:${m?.[0]?.legacy_id}`);

    // 2. One Broken ID
    const { data: allMembers } = await supabase.from('members').select('id');
    const validIds = new Set(allMembers?.map(x => x.id));

    let brokenId = null;
    let page = 0;
    while (!brokenId) {
        const { data: att } = await supabase.from('service_attendance').select('member_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (!att || att.length === 0) break;
        for (const a of att) {
            if (!validIds.has(a.member_id)) {
                brokenId = a.member_id;
                break;
            }
        }
        page++;
        if (page > 50) break;
    }
    console.log(`BROKEN_SAMPLE:${brokenId}`);
    process.exit(0);
};

microAudit();
