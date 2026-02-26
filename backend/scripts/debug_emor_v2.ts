import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function debugEmor() {
    const name = 'emor andrew';
    const { data, error } = await supabase
        .from('members')
        .select('id, name, phone, residency, name_norm, phone_last9, residency_norm')
        .eq('name_norm', name);

    if (error) { console.error(error); return; }

    console.log(`Found ${data?.length} records for '${name}':`);
    data?.forEach(m => {
        console.log(`- ID: ${m.id}`);
        console.log(`  Name:   '${m.name}'`);
        console.log(`  Phone:  '${m.phone}'`);
        console.log(`  Loc:    '${m.residency}'`);
        console.log(`  Norm:   ${m.name_norm} | ${m.phone_last9} | ${m.residency_norm}`);
    });
}

debugEmor();
