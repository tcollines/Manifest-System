
// @ts-nocheck
import { supabase } from '../src/supabase';

export const hypothesisCheck = async () => {
    console.log('--- HYPOTHESIS CHECK: Broken UUID = Legacy ID? ---');

    try {
        // 1. Get 10 broken IDs
        const { data: allMembers } = await supabase.from('members').select('id');
        const validIds = new Set(allMembers?.map(x => x.id));

        let brokenIds = [];
        let page = 0;

        while (brokenIds.length < 10) {
            const { data: att } = await supabase.from('service_attendance').select('member_id').range(page * 1000, (page + 1) * 1000 - 1);
            if (!att || att.length === 0) break;

            for (const a of att) {
                if (!validIds.has(a.member_id)) {
                    if (!brokenIds.includes(a.member_id)) brokenIds.push(a.member_id);
                }
            }
            page++;
            if (page > 50) break; // safety
        }

        console.log('Sample Broken IDs:', brokenIds);

        // 2. Check if these exist in members.legacy_id
        if (brokenIds.length > 0) {
            const { data: matches, error } = await supabase
                .from('members')
                .select('id, legacy_id')
                .in('legacy_id', brokenIds);

            if (error) console.error(error);

            console.log(`Matches found in members.legacy_id: ${matches?.length}`);
            if (matches && matches.length > 0) {
                console.log('CONFIRMED! Broken IDs map to legacy_id.');
                console.log('Sample Match:', matches[0]);
            } else {
                console.log('No matches found in legacy_id.');
            }
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};

hypothesisCheck();
