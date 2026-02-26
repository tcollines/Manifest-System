import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function finalChunkedVerify() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', uuid);
    if (!att) { console.log('No att found'); return; }

    const ids = Array.from(new Set(att.map(a => a.member_id)));
    console.log(`Verifying ${ids.length} unique member IDs from S378...`);

    let foundCount = 0;
    const CHUNK = 50;
    for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { data } = await supabase.from('members').select('id').in('id', chunk);
        foundCount += data?.length || 0;
    }

    console.log(`RESULT: ${foundCount} / ${ids.length} matching members found in database.`);
}

finalChunkedVerify();
