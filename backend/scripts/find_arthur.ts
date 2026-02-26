import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findArthur() {
    const { data: members } = await supabase.from('members').select('*').ilike('name', '%Mwondha Arthur%');
    console.log('Arthur Records:', members);

    if (members && members.length > 0) {
        const arthur = members[0];
        const { data: attendance } = await supabase.from('service_attendance').select('*').eq('member_id', arthur.id);
        console.log('Arthur Attendance Records:', attendance);
    }
}

findArthur();
