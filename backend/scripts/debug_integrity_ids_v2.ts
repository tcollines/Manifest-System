
// @ts-nocheck
import { supabase } from '../src/supabase';

export const debugIds = async () => {
    console.log('--- DEBUG IDs (V2) ---');

    try {
        // Fetch 50 members to get a sample of legacy IDs
        const { data: members, error: mError } = await supabase.from('members').select('id, legacy_id').limit(50);
        if (mError) console.error(mError);

        console.log('--- Sample Members Legacy IDs ---');
        members?.forEach(m => {
            if (m.legacy_id) console.log(`Legacy: "${m.legacy_id}"`);
        });

        // Fetch attendance incrementally to find broken ones
        let brokenFound = 0;
        let page = 0;
        const pageSize = 1000;

        console.log('--- Searching for Broken Attendance IDs ---');

        // cache member IDs for check
        const { data: allMembers } = await supabase.from('members').select('id');
        const validIds = new Set(allMembers?.map(m => m.id));

        while (brokenFound < 10) {
            const { data: att, error: aError } = await supabase
                .from('service_attendance')
                .select('member_id')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (!att || att.length === 0) break;

            for (const a of att) {
                if (!validIds.has(a.member_id)) {
                    console.log(`BROKEN ID found: "${a.member_id}" (Type: ${typeof a.member_id})`);
                    brokenFound++;
                    if (brokenFound >= 10) break;
                }
            }
            page++;
            if (page > 10) break; // safety
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};

debugIds();
