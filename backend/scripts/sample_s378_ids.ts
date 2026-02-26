import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function sampleIds() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { data: att } = await supabase.from('service_attendance').select('id, member_id').eq('service_id', serviceId).limit(10);

    if (!att) return;
    console.log('Sample Attendance Records:');
    for (const a of att) {
        const { data: mem } = await supabase.from('members').select('id, name').eq('id', a.member_id).single();
        console.log(`RecordID: ${a.id} | MemberID: ${a.member_id} | In DB: ${!!mem} | Name: ${mem?.name || 'UNKNOWN'}`);
    }
}

sampleIds();
