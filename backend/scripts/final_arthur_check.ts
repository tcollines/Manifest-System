import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function finalArthurCheck() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { data: arthur } = await supabase.from('members').select('id, name, joined_date').ilike('name', '%MWONDHA ARTHUR%').single();
    if (arthur) {
        const { data: att } = await supabase.from('service_attendance').select('*').eq('member_id', arthur.id).eq('service_id', uuid).single();
        console.log(`Arthur (${arthur.id}) S378 Attendance:`, att ? 'PRESENT' : 'ABSENT');
    } else {
        console.log('Arthur NOT FOUND.');
    }
}

finalArthurCheck();
