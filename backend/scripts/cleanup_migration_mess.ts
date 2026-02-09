import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function cleanup() {
    console.log('Cleaning up Migration Mess...');

    // 1. Find Stuck Renames
    const { data: stuck, error } = await supabase
        .from('members')
        .select('id, name')
        .ilike('name', '%_MIGRATION_%');

    if (error) console.error(error);

    if (stuck && stuck.length > 0) {
        console.log(`Found ${stuck.length} stuck renames. Reverting...`);
        for (const s of stuck) {
            // Name format: "Original Name_MIGRATION_oldIdPrefix"
            // We can just strip the suffix.
            // Split by _MIGRATION_
            const parts = s.name.split('_MIGRATION_');
            const originalName = parts[0];

            if (originalName) {
                const { error: revErr } = await supabase
                    .from('members')
                    .update({ name: originalName })
                    .eq('id', s.id);
                if (revErr) console.error(`Failed to revert ${s.id}:`, revErr);
                else console.log(`Reverted ${s.id} to ${originalName}`);
            }
        }
    } else {
        console.log('No stuck renames found.');
    }

    // 2. Find Orphaned New IDs?
    // Hard to identify unless we track them.
    // Ideally we assume if we reverted the old one, we can leave the new one (it has no dependencies or partial dependencies).
    // But it's a duplicate member!
    // We should delete "New" members that have NO dependencies? 
    // Or just let them be handling duplicates manually?
    // Let's rely on name/phone unique constraint.
    // If we reverted the name, we restored the constraint.
    // If we created a new member with SAME name/phone, we wouldn't have been able to Revert the old one!
    // So if Revert Succeeded, the New Member MUST NOT EXIST (or have different name?).
    // Wait. If Revert Succeeded, then potential duplicate New Member prevents Revert?
    // Yes. `update members set name=Original where id=Old` will FAIL if New Member with Original name exists.

    // So if Revert fails, we know there is a duplicate New Member.
    // In that case, we should DELETE the New Member (it's partial/failed migration) and THEN Revert.
}

cleanup();
