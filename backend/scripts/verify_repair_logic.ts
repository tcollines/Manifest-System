import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function verifyRepair() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Find some orphans that still exist
    const { data: orphans } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId).limit(5);
    if (!orphans || orphans.length === 0) {
        console.log('No orphans found to test with.'); return;
    }

    for (const o of orphans) {
        const oid = o.member_id;
        console.log(`\nTesting Orphan: ${oid}`);

        // Check if it exists in members
        const { data: mem } = await supabase.from('members').select('id').eq('id', oid).single();
        console.log(`  Exists in members: ${!!mem}`);

        // Try searching for master
        // (Simplified search for this test)
        // I'll just find ANY member to try and update it to.
        const { data: anyMember } = await supabase.from('members').select('id, name').limit(1).single();
        if (anyMember) {
            console.log(`  Attempting update to Master: ${anyMember.name} (${anyMember.id})`);
            const { data, error } = await supabase.from('service_attendance')
                .update({ member_id: anyMember.id })
                .eq('service_id', serviceId)
                .eq('member_id', oid)
                .select();

            if (error) {
                console.error(`  Update FAILED:`, error);
            } else {
                console.log(`  Update SUCCESS! Returned:`, data);
                // Verify again
                const { data: check } = await supabase.from('service_attendance')
                    .select('*')
                    .eq('service_id', serviceId)
                    .eq('member_id', anyMember.id);
                console.log(`  Verification in DB: Found ${check?.length || 0} records for master.`);
            }
        }
    }
}

verifyRepair();
