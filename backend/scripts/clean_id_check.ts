import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function cleanIdCheck() {
    const { data: members } = await supabase.from('members').select('id, name').limit(5);
    console.log('--- SAMPLE IDS ---');
    members?.forEach(m => {
        console.log(`ID: ${m.id} (Length: ${m.id.length}) Name: ${m.name}`);
    });

    const { data: martha } = await supabase.from('members').select('id, name').ilike('name', '%KAJOBA MARTHA%').single();
    if (martha) {
        console.log('--- MARTHA ID ---');
        console.log(`ID: ${martha.id} (Length: ${martha.id.length}) Name: ${martha.name}`);
    }
}

cleanIdCheck();
