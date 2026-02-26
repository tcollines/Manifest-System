import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function microAudit() {
    console.log('--- MICRO AUDIT S378 ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Get one record
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId).limit(1).single();
    if (!att) { console.log('No S378 records found in table!'); return; }

    console.log(`Checking Member ID: [${att.member_id}] (Length: ${att.member_id.length})`);

    // 2. Check members table
    const { data: mem, error: memErr } = await supabase.from('members').select('id, name').eq('id', att.member_id).single();

    if (memErr) {
        console.log(`Member Error: ${memErr.message}`);
    } else {
        console.log(`Success! Member Found: ${mem.name} [${mem.id}]`);
    }

    // 3. Search members by name instead
    if (memErr) {
        const { data: backup } = await supabase.from('members').select('id, name').limit(5);
        console.log('Sample Healthy Member IDs in table:');
        backup?.forEach(m => console.log(`  - [${m.id}] (${m.id.length}) ${m.name}`));
    }
}

microAudit();
