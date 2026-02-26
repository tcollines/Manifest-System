import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function preciseCheck() {
    const sampleId = '8cd31ea5-9569-4d4e-a429-74ffbdef22df';

    // 1. Search by ID
    const { data: byId } = await supabase.from('members').select('id, name').eq('id', sampleId).single();
    console.log(`Search by exact ID (${sampleId}):`, byId || 'NOT FOUND');

    // 2. Search by Name (KAJOBA MARTHA - should match that ID if I re-mapped correctly)
    const { data: byName } = await supabase.from('members').select('id, name').ilike('name', '%KAJOBA MARTHA%').single();
    console.log(`Search by Name (KAJOBA MARTHA):`, byName || 'NOT FOUND');

    if (byName) {
        console.log(`Current ID in DB for Martha: [${byName.id}] (Length: ${byName.id.length})`);
        console.log(`Sample ID from Attendance: [${sampleId}] (Length: ${sampleId.length})`);

        // Show hex to check for hidden chars
        const toHex = (s: string) => Buffer.from(s).toString('hex');
        console.log(`Martha ID Hex: ${toHex(byName.id)}`);
        console.log(`Sample ID Hex: ${toHex(sampleId)}`);
    }
}

preciseCheck();
