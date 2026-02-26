
// @ts-nocheck
import { supabase } from '../src/supabase';

export const audit = async () => {
    let counts = { uuid: 0, bulk: 0, legacyShort: 0, other: 0 };
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('service_attendance').select('member_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        data.forEach(r => {
            const id = String(r.member_id);
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) counts.uuid++;
            else if (id.startsWith('m-bulk-')) counts.bulk++;
            else if (/^[A-Z]-\d+/.test(id)) counts.legacyShort++;
            else counts.other++;
        });
        page++;
    }
    console.log('COUNTS:', JSON.stringify(counts));
    process.exit(0);
};

audit();
