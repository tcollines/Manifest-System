import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function investigateStuckMember() {
    const legacyId = 'm-1769185045671'; // From screenshot
    console.log(`Investigating ${legacyId}...`);

    // 1. Get Legacy Member State
    const { data: legacy } = await supabase.from('members').select('*').eq('id', legacyId).single();
    if (!legacy) {
        console.log('Legacy Member NOT found (maybe deleted?)');
        return;
    }
    console.log('Legacy Member Found:', legacy.name); // Should be _MIGRATION_...

    // 2. Search for New Member (Original Name)
    // Extract original name from "Ntalo Revious_MIGRATION_..."
    const originalName = legacy.name.split('_MIGRATION_')[0];
    console.log('Looking for New Member with name:', originalName);

    const { data: newMembers } = await supabase.from('members').select('*').eq('name', originalName);
    console.log('Found New Members:', newMembers?.length);
    newMembers?.forEach(m => console.log(` - ${m.id} (Ref: ${m.referral_source})`));

    // 3. Check Dependencies (Why wasn't legacy deleted?)
    // We'll try to delete it and see the error
    console.log('Attempting DELETE to catch FK error...');
    const { error: delErr } = await supabase.from('members').delete().eq('id', legacyId);

    if (delErr) {
        console.error('DELETE ERROR:', delErr.message);
        console.error('Start Details:', delErr.details);
        console.error('End Details');
    } else {
        console.log('Delete Succeeded (Odd, why did it fail in script?)');
    }
}

investigateStuckMember();
