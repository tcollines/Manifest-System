
// @ts-nocheck
import { supabase } from '../src/supabase';

export const verifyFK = async () => {
    console.log('--- VERIFYING FK CONSTRAINTS ---');

    // 1. Test Dummy Member Insertion
    console.log('Testing Bad Member ID insertion...');
    const badMemberId = '00000000-0000-0000-0000-000000000000';
    // We need a valid service ID to isolate the member FK failure
    const { data: validService } = await supabase.from('ministry_events').select('id').limit(1).single();
    if (!validService) { console.error('No valid service found to test with.'); return; }

    const { error: memberError } = await supabase.from('service_attendance').insert({
        service_id: validService.id,
        member_id: badMemberId
    });

    if (memberError) {
        if (memberError.code === '23503') {
            console.log('SUCCESS: Member FK prevented bad insert.');
        } else {
            console.log('FAILURE: Unexpected error code for bad member:', memberError.code, memberError.message);
        }
    } else {
        console.log('FAILURE: Bad member insert SUCCEEDED (FK missing or broken).');
        // Clean up if it succeeded
        await supabase.from('service_attendance').delete().eq('member_id', badMemberId);
    }

    // 2. Test Dummy Service Insertion
    console.log('Testing Bad Service ID insertion...');
    const badServiceId = '00000000-0000-0000-0000-000000000000'; // Assuming UUID format for service_id column if it's text/uuid
    // We need a valid member ID to isolate the service FK failure
    const { data: validMember } = await supabase.from('members').select('id').limit(1).single();
    if (!validMember) { console.error('No valid member found to test with.'); return; }

    const { error: serviceError } = await supabase.from('service_attendance').insert({
        service_id: badServiceId,
        member_id: validMember.id
    });

    if (serviceError) {
        if (serviceError.code === '23503') {
            console.log('SUCCESS: Service FK prevented bad insert.');
        } else {
            console.log('FAILURE: Unexpected error code for bad service:', serviceError.code, serviceError.message);
        }
    } else {
        console.log('FAILURE: Bad service insert SUCCEEDED (FK missing or broken).');
        // Clean up
        await supabase.from('service_attendance').delete().eq('service_id', badServiceId);
    }

    process.exit(0);
};

verifyFK();
