import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function audit() {
    console.log('Auditing Migration State...');

    // 1. Check for Stuck Renames
    const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .ilike('name', '%_MIGRATION_%');

    console.log(`Stuck Renames: ${count}`);
    if (error) console.error(error);

    // 2. Check for New UUIDs (Total migrated so far)
    // Assuming new UUIDs don't start with 'm-'
    const { count: migratedCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .not('id', 'ilike', 'm-%');

    console.log(`Potential Migrated Count: ${migratedCount}`);

    // 3. Check for Legacy IDs remaining
    const { count: legacyCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .ilike('id', 'm-%');

    console.log(`Remaining Legacy IDs: ${legacyCount}`);
}

audit();
