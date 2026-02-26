import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function verifyCompletion() {
    console.log('Verifying Migration Completion...');

    // 1. Count Legacy IDs
    const { count: legacyCount, error: legErr } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .ilike('id', 'm-%');

    if (legErr) console.error('Error counting legacy:', legErr);
    console.log(`Remaining Legacy IDs: ${legacyCount}`);

    // 2. Count Total Members
    const { count: total, error: totErr } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

    console.log(`Total Members: ${total}`);

    // 3. Count UUID Members
    // Simple check: id length is 36
    // Or regex check? PostgREST regex syntax is tricky.
    // Just infer: Total - Legacy = UUID (roughly)

    if (legacyCount === 0) {
        console.log('SUCCESS: No legacy IDs found.');
    } else {
        console.log('FAILURE: Legacy IDs still exist.');
    }
}

verifyCompletion();
