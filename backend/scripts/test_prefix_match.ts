
// @ts-nocheck
import { supabase } from '../src/supabase';

export const checkPrefix = async () => {
    console.log('--- TESTING PREFIX MATCH HYPOTHESIS ---');

    // 1. Get all valid IDs
    const { data: members } = await supabase.from('members').select('id');
    const validIds = new Set(members.map(m => m.id));
    const validPrefixes = new Map(); // Prefix -> Full ID
    members.forEach(m => {
        const prefix = m.id.substring(0, 23); // First 3 groups: 8+4+4+hyphens = 8+1+4+1+4+1 = 19? 
        // UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        // Groups: 8, 4, 4, 4, 12
        // Lengths: 8, 13, 18, 23
        // Let's use first 3 groups: e.g. "44ae078e-5f12-495c-" (length 19)
        // Wait, 8 chars + 1 + 4 chars + 1 + 4 chars + 1 = 19 chars including the last hyphen?
        // 44ae078e-5f12-495c (length 18)
        const p = m.id.substring(0, 18);
        if (!validPrefixes.has(p)) validPrefixes.set(p, []);
        validPrefixes.get(p).push(m.id);
    });

    // 2. Get broken IDs
    const { data: attendance } = await supabase.from('service_attendance').select('member_id');
    const broken = attendance.filter(a => !validIds.has(a.member_id));

    let matchCount = 0;
    let sampleMatches = [];

    broken.forEach(b => {
        const p = b.member_id.substring(0, 18);
        if (validPrefixes.has(p)) {
            matchCount++;
            if (sampleMatches.length < 5) {
                sampleMatches.push({
                    orphan: b.member_id,
                    matches: validPrefixes.get(p)
                });
            }
        }
    });

    console.log(`Total Broken: ${broken.length}`);
    console.log(`Prefix Matches Found: ${matchCount}`);
    console.log('Samples:', JSON.stringify(sampleMatches, null, 2));

    process.exit(0);
};

checkPrefix();
