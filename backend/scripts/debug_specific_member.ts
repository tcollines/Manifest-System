import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function debugMember(legacyId: string) {
    console.log(`Debugging ${legacyId}...`);

    // 1. Get Member Details
    const { data: member, error: mErr } = await supabase
        .from('members')
        .select('*')
        .eq('id', legacyId)
        .single();

    if (mErr) {
        console.error('Member not found:', mErr);
        return;
    }

    console.log('Found Member:', member.name);

    // 2. Check for Duplicate (New UUID)
    const { data: duplicates, error: dErr } = await supabase
        .from('members')
        .select('*')
        .eq('name', member.name)
        .eq('phone', member.phone)
        .neq('id', legacyId);

    console.log('Potential Duplicates (Migrated?):', duplicates?.length);
    if (duplicates?.length) {
        duplicates.forEach(d => console.log(` - ${d.id} (${d.status})`));
    }

    // 3. Try to Delete Legacy ID (Expect Error if FK missing)
    console.log('Attempting DELETE of Legacy ID...');
    const { error: delErr } = await supabase
        .from('members')
        .delete()
        .eq('id', legacyId);

    if (delErr) {
        console.error('DELETE FAILED:', delErr);
        console.log('Code:', delErr.code);
        console.log('Details:', delErr.details);
        // PostgREST errors usually give "update or delete on table ... violates foreign key constraint ..."
    } else {
        console.log('DELETE SUCCESS! (It was not stuck permanently, maybe just queue issues?)');
    }
}

debugMember('m-1769097187462');
