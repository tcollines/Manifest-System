
import { supabase } from '../src/supabase';

export const inspect = async () => {
    console.log('--- Inspecting S378 Data (Chunked) ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    try {
        const { data: attUUID } = await supabase
            .from('service_attendance')
            .select('member_id')
            .eq('service_id', serviceId);

        console.log(`Attendance (UUID): ${attUUID?.length || 0}`);

        if (attUUID && attUUID.length > 0) {
            const ids = attUUID.map(a => a.member_id);
            const chunkSize = 200;
            let foundMembersCount = 0;
            let firstTimersCount = 0;

            for (let i = 0; i < ids.length; i += chunkSize) {
                const chunk = ids.slice(i, i + chunkSize);
                const { data: members, error } = await supabase
                    .from('members')
                    .select('id, category')
                    .in('id', chunk);

                if (error) {
                    console.error('Chunk Error:', error);
                } else {
                    foundMembersCount += members?.length || 0;
                    firstTimersCount += members?.filter(m => m.category === 'First Timer').length || 0;
                }
            }

            console.log(`Total Valid Members Found: ${foundMembersCount}`);
            console.log(`Total First Timers Found: ${firstTimersCount}`);
        }

    } catch (err: any) {
        console.error('Error:', err.message);
    }
    process.exit(0);
};

inspect();
