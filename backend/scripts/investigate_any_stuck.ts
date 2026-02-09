import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function investigateAnyStuck() {
    console.log(`Scanning for ANY stuck renames...`);

    const { data: stuck, error } = await supabase
        .from('members')
        .select('id, name')
        .ilike('name', '%_MIGRATION_%')
        .limit(1);

    if (!stuck || stuck.length === 0) {
        console.log('No stuck renames found. (Are we looking at the right DB?)');
        return;
    }

    const m = stuck[0];
    console.log(`Found Stuck Member: ${m.name} (${m.id})`);

    // Attempt Delete
    console.log('Attempting DELETE to catch FK error...');
    const { error: delErr } = await supabase.from('members').delete().eq('id', m.id);

    if (delErr) {
        console.error('DELETE ERROR MSG:', delErr.message);
        console.error('DETAILS:', delErr.details); // This usually names the constraint
    } else {
        console.log('Delete Succeeded (Odd, why stuck?)');
    }
}

investigateAnyStuck();
