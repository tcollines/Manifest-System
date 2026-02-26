
// @ts-nocheck
import { supabase } from '../src/supabase';

export const auditSouls = async () => {
    console.log('--- AUDITING SOULS REFERENCES ---');

    // 1. Get all members
    const allMembers = new Set();
    let page = 0;
    while (true) {
        const { data, error } = await supabase.from('members').select('id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data || data.length === 0) break;
        data.forEach(m => allMembers.add(m.id));
        page++;
    }
    console.log(`Members Loaded: ${allMembers.size}`);

    // 2. Get Souls
    const { count, data: souls, error: soulError } = await supabase.from('souls').select('id, captured_by, invited_by, first_name, last_name, source_type, source_id', { count: 'exact' });
    if (soulError) { console.error('Souls error', soulError); return; }
    console.log(`Souls Loaded: ${souls?.length} (Total: ${count})`);


    let brokenCaptured = 0;
    let brokenInvited = 0;

    souls.forEach(s => {
        if (s.captured_by && !allMembers.has(s.captured_by)) {
            // Check if captured_by is a UUID
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.captured_by)) {
                brokenCaptured++;
                if (brokenCaptured <= 5) console.log(`Broken captured_by: ${s.captured_by} in Soul ${s.first_name} ${s.last_name}`);
            }
        }

        // invited_by might be JSON or String. Let's check if it's a UUID string first
        if (s.invited_by && typeof s.invited_by === 'string' && !allMembers.has(s.invited_by)) {
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.invited_by)) {
                brokenInvited++;
                if (brokenInvited <= 5) console.log(`Broken invited_by: ${s.invited_by} in Soul ${s.first_name} ${s.last_name}`);
            }
        }
        // If invited_by is JSON, we might need parsing. But Supabase usually returns object if column is jsonb.
        // If it's text, it returns string.
    });

    console.log(`Broken Captured_By: ${brokenCaptured}`);
    console.log(`Broken Invited_By: ${brokenInvited}`);
    process.exit(0);
};

auditSouls();
