import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function traceRecords() {
    console.log('--- TRACING S378 RECORDS ---');

    // 1. Literal search for 'S378'
    const { count: s378Count } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', 'S378');
    console.log(`Explicit 'S378' count: ${s378Count}`);

    // 2. Literal search for official UUID
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { count: uuidCount } = await supabase.from('service_attendance').select('*', { count: 'exact', head: true }).eq('service_id', uuid);
    console.log(`Explicit UUID count: ${uuidCount}`);

    // 3. Like search
    const { data: likeMatches } = await supabase.from('service_attendance').select('service_id').ilike('service_id', '%378%').limit(5);
    console.log(`Like '%378%' matches:`, likeMatches);

    if (likeMatches && likeMatches.length > 0) {
        const id = likeMatches[0].service_id;
        console.log(`Exact matching ID: [${id}] (Length: ${id.length})`);
    }
}

traceRecords();
