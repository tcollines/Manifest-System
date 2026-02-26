
// @ts-nocheck
import { supabase } from '../src/supabase';

export const findMatch = async () => {
    console.log('--- FINDING MATCH ---');

    try {
        // 1. Get 100 broken IDs
        const { data: allMembers } = await supabase.from('members').select('id');
        const validIds = new Set(allMembers?.map(x => x.id));

        let brokenIds = [];
        let page = 0;

        while (brokenIds.length < 100) {
            const { data: att } = await supabase.from('service_attendance').select('member_id').range(page * 1000, (page + 1) * 1000 - 1);
            if (!att || att.length === 0) break;

            for (const a of att) {
                if (!validIds.has(a.member_id)) {
                    if (!brokenIds.includes(a.member_id)) brokenIds.push(a.member_id);
                }
            }
            page++;
            if (page > 50) break;
        }

        console.log(`Checking ${brokenIds.length} broken IDs against members.legacy_id...`);

        // 2. Check matches
        const { data: matches, error } = await supabase
            .from('members')
            .select('id, legacy_id')
            .in('legacy_id', brokenIds);

        if (error) {
            console.error('Error checking matches:', error);
            return;
        }

        console.log(`Matches Found: ${matches?.length}`);

        if (matches && matches.length > 0) {
            console.log('--- MATCH DETAILS ---');
            matches.forEach(m => {
                console.log(`Broken ID (in legacy_id): ${m.legacy_id} -> New ID: ${m.id}`);
            });
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};

findMatch();
