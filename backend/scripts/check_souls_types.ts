
// @ts-nocheck
import { supabase } from '../src/supabase';

export const checkTypes = async () => {
    console.log('--- CHECKING NON-UUID VALUES IN SOULS ---');

    const { data: souls, error } = await supabase.from('souls').select('id, captured_by, invited_by');
    if (error) { console.error(error); return; }

    let badCaptured = 0;
    let badInvited = 0;

    souls.forEach(s => {
        if (s.captured_by) {
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.captured_by)) {
                badCaptured++;
                console.log(`Bad captured_by (Not UUID): ${s.captured_by}`);
            }
        }
        if (s.invited_by) {
            // invited_by might be an object if jsonb?
            if (typeof s.invited_by === 'object') {
                // It's JSON. Is it a UUID wrapper?
                // If it's pure JSON, it FAILS a UUID FK check.
                badInvited++;
                console.log(`Bad invited_by (JSON/Object): ${JSON.stringify(s.invited_by)}`);
            } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.invited_by)) {
                badInvited++;
                console.log(`Bad invited_by (String Not UUID): ${s.invited_by}`);
            }
        }
    });

    console.log(`Non-UUID Captured: ${badCaptured}`);
    console.log(`Non-UUID Invited: ${badInvited}`);
    process.exit(0);
};

checkTypes();
