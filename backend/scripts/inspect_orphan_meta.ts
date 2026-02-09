import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function inspectOrphanMeta() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Get orphans
    const { data: att } = await supabase.from('service_attendance').select('member_id, created_at').eq('service_id', uuid);
    const ids = Array.from(new Set(att?.map((a: any) => a.member_id) || []));

    // Check in members table
    const { data: mems } = await supabase.from('members').select('id').in('id', ids);
    const memSet = new Set(mems?.map((m: any) => m.id));

    const orphans = att?.filter((a: any) => !memSet.has(a.member_id)) || [];

    console.log(`Analyzing ${orphans.length} orphan entries...`);

    // Group by creation time (roughly)
    const times: Record<string, number> = {};
    orphans.forEach(o => {
        const t = o.created_at.substring(0, 16); // Minute precision
        times[t] = (times[t] || 0) + 1;
    });

    console.log('Orphan creation times (minute precision):', times);

    if (orphans.length > 0) {
        console.log('Sample orphans:', orphans.slice(0, 5));
    }
}

inspectOrphanMeta();
