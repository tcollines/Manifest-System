import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function findOrphanIdentities() {
    const orphans = [
        '44ae078e-5f12-495c-87d8-3c9e2c0f1a46',
        '0989adcb-4034-477d-3c9e2c0f1a46'
    ];

    console.log('Searching for orphan info in passengers table...');

    for (const id of orphans) {
        const { data, error } = await supabase
            .from('passengers')
            .select('name, contact, residence')
            .eq('member_id', id)
            .limit(1);

        if (data && data.length > 0) {
            console.log(`Found Identity for ${id}:`, data[0]);
        } else {
            console.log(`No passenger record for ${id}`);
        }
    }
}

findOrphanIdentities();
