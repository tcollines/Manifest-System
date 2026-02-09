
// @ts-nocheck
import { supabase } from '../src/supabase';

export const analyzeBody = async () => {
    const { data, error } = await supabase.from('service_attendance').select('member_id');
    if (error) {
        console.error(error);
        return;
    }

    let uuid = 0;
    let legacy = 0;
    let other = 0;
    let bulk = 0;

    data.forEach(r => {
        const id = String(r.member_id);
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            uuid++;
        } else if (/^m-bulk/i.test(id)) {
            bulk++;
        } else if (/^[A-Z]-\d+/i.test(id)) {
            legacy++;
        } else {
            other++;
        }
    });

    console.log(`UUID: ${uuid}`);
    console.log(`BULK: ${bulk}`);
    console.log(`LEGACY: ${legacy}`);
    console.log(`OTHER: ${other}`);
    process.exit(0);
};

analyzeBody();
