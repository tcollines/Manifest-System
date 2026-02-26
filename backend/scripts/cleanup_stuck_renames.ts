import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function cleanupStuck() {
    console.log('Scanning for stuck renames to clean up...');

    let processed = 0;
    let hasMore = true;

    while (hasMore) {
        const { data: stuck, error } = await supabase
            .from('members')
            .select('*')
            .ilike('name', '%_MIGRATION_%')
            .limit(50);

        if (error) { console.error(error); break; }
        if (!stuck || stuck.length === 0) {
            hasMore = false;
            console.log('No more stuck renames found.');
            break;
        }

        console.log(`Processing batch of ${stuck.length} stuck records...`);

        for (const m of stuck) {
            // Name format: "Original Name_MIGRATION_..."
            const originalName = m.name.split('_MIGRATION_')[0];

            // Find potential New UUID members
            const { data: matches } = await supabase
                .from('members')
                .select('id, name')
                .eq('name', originalName) // Assuming duplicate check was on Name
                .neq('id', m.id);

            if (matches && matches.length > 0) {
                console.log(`Found ${matches.length} migrated match(es) for ${originalName}. Deleting legacy ${m.id}...`);

                // We assume attendance moved. Even if it didn't, we can't merge easily here without context.
                // But strictly speaking, if we renamed it, we INTENDED to migrate it.
                // The migration script logic puts Rename -> Create -> Update FK -> Delete.
                // If we are here, Delete failed. 
                // We should retry Delete.

                const { error: delErr } = await supabase
                    .from('members')
                    .delete()
                    .eq('id', m.id);

                if (delErr) {
                    console.error(`  DELETE FAILED for ${m.id}: ${delErr.message}`);
                } else {
                    console.log(`  Deleted ${m.id}`);
                    processed++;
                }
            } else {
                console.warn(`  No migrated match found for ${originalName} (${m.id}). Reverting name...`);
                // Revert name so migration script can pickup again (or we leave it?)
                // If we revert, the PATCHED migration script will pick it up (because it has no _MIGRATION_).
                await supabase.from('members').update({ name: originalName }).eq('id', m.id);
            }
        }
    }
}

cleanupStuck();
