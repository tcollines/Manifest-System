import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function verifyDB() {
    console.log('--- DB CONNECTIVITY CHECK ---');

    // 1. Members count
    const { count: memCount, error: memError } = await supabase.from('members').select('*', { count: 'exact', head: true });
    console.log('Members Table:', memError ? `ERROR: ${memError.message}` : `Count: ${memCount}`);

    // 2. Attendance count
    const { count: attCount, error: attError } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true });
    console.log('Attendance Table:', attError ? `ERROR: ${attError.message}` : `Count: ${attCount}`);

    // 3. Events count
    const { count: eventCount, error: eventError } = await supabase.from('ministry_events').select('*', { count: 'exact', head: true });
    console.log('Events Table:', eventError ? `ERROR: ${eventError.message}` : `Count: ${eventCount}`);

    // 4. Sample Member
    const { data: sample } = await supabase.from('members').select('id, name').limit(1);
    console.log('Sample Member:', sample);
}

verifyDB();
