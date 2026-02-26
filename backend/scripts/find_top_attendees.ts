import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findTopAttendees() {
    const { data: all } = await supabase.from('service_attendance').select('member_id');
    const counts: Record<string, number> = {};
    all?.forEach(a => counts[a.member_id] = (counts[a.member_id] || 0) + 1);

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    console.log('Top 10 Attendees:');
    for (const [id, count] of sorted.slice(0, 10)) {
        const { data: mem } = await supabase.from('members').select('name').eq('id', id).single();
        console.log(`ID: ${id} | Count: ${count} | Name: ${mem?.name || 'UNKNOWN'}`);
    }
}

findTopAttendees();
