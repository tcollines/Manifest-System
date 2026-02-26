import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function inspectStats() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const date = '2026-02-08';

    // 1. Check database directly
    const { data: attendance } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    const memberIds = attendance?.map(a => a.member_id) || [];
    const { data: members } = await supabase.from('members').select('id, joined_date').in('id', memberIds);

    const firstTimers = (members || []).filter(m => {
        if (!m.joined_date) return false;
        const jd = m.joined_date.split('T')[0].split(' ')[0];
        return jd === date;
    }).length;

    console.log('Database View:');
    console.log({
        total: members?.length || 0,
        firstTimers: firstTimers,
        uniqueRecordIds: memberIds.length
    });

    // 2. Check Service Metadata (for manual counts)
    const { data: event } = await supabase.from('ministry_events').select('stats').eq('id', serviceId).single();
    console.log('\nEvent Stats Metadata:');
    console.log(event?.stats);
}

inspectStats();
