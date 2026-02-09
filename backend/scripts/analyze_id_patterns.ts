
// @ts-nocheck
import { supabase } from '../src/supabase';

export const analyzeBody = async () => {
    console.log('--- ANALYZING MEMBER_ID PATTERNS ---');
    const { data, error } = await supabase.from('service_attendance').select('member_id');
    if (error) {
        console.error(error);
        return;
    }

    const patterns = {
        uuid: 0,
        legacy: 0,
        other: 0,
        samples_legacy: new Set()
    };

    data.forEach(r => {
        const id = String(r.member_id);
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            patterns.uuid++;
        } else if (/^[A-Z]-\d+/i.test(id) || /^m-bulk/i.test(id)) {
            patterns.legacy++;
            if (patterns.samples_legacy.size < 10) patterns.samples_legacy.add(id);
        } else {
            patterns.other++;
        }
    });

    console.log('Patterns:', {
        uuid: patterns.uuid,
        legacy: patterns.legacy,
        other: patterns.other,
        samples_legacy: Array.from(patterns.samples_legacy)
    });
    process.exit(0);
};

analyzeBody();
