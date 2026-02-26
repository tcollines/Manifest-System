import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

const BATCH_SIZE = 50;
const MAPPING_FILE = path.resolve(__dirname, '../migration_mapping.json');

async function runJsonMigration() {
    console.log('Starting Migration (JSON Mapping Mode)...');

    let mapping: any[] = [];
    if (fs.existsSync(MAPPING_FILE)) {
        mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
    }

    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
        // 1. Fetch Batch
        const { data: members, error } = await supabase
            .from('members')
            .select('*')
            .ilike('id', 'm-%')
            .limit(BATCH_SIZE);

        if (error) {
            console.error('Error fetching batch:', error);
            break;
        }

        if (!members || members.length === 0) {
            console.log('No more legacy IDs found.');
            hasMore = false;
            break;
        }

        console.log(`Processing batch of ${members.length} members...`);

        for (const m of members) {
            const oldId = m.id;
            const newId = uuidv4();

            try {
                // Step 0: Rename Old Member to free up Unique Constraint (Name+Phone)
                const tempName = `${m.name}_MIGRATION_${oldId.substring(0, 4)}`;
                const { error: renameErr } = await supabase
                    .from('members')
                    .update({ name: tempName })
                    .eq('id', oldId);

                if (renameErr) {
                    console.error(`Rename Failed for ${oldId}:`, renameErr.message);
                    continue;
                }

                // Step 1: Create New Member via RPC (Now the name/phone is free)
                const rpcPayload = {
                    _id: newId,
                    _name: m.name, // Restore original name
                    _category: m.category,
                    _phone: m.phone,
                    _status: m.status,
                    _check_in_time: m.check_in_time,
                    _gender: m.gender,
                    _residency: m.residency,
                    _born_again: m.born_again,
                    _joined_date: m.joined_date,
                    _attended_service_ids: m.attended_service_ids || [],
                    _current_service_id: null
                };

                const { error: createErr } = await supabase.rpc('submit_member_entry', rpcPayload);
                if (createErr) {
                    console.error(`RPC Create Failed for ${oldId} (after rename):`, createErr.message);
                    // Try to revert rename?
                    await supabase.from('members').update({ name: m.name }).eq('id', oldId);
                    continue;
                }

                // Step 1b: Update "Extended Fields" via Standard Update
                const extendedUpdates: any = {};
                if (m.occupation) extendedUpdates.occupation = m.occupation;
                if (m.place_of_work) extendedUpdates.place_of_work = m.place_of_work;
                if (m.email) extendedUpdates.email = m.email;
                if (m.is_phaneroo_member) extendedUpdates.is_phaneroo_member = m.is_phaneroo_member;
                if (m.referral_source) extendedUpdates.referral_source = m.referral_source;

                if (Object.keys(extendedUpdates).length > 0) {
                    const { error: extErr } = await supabase.from('members').update(extendedUpdates).eq('id', newId);
                    if (extErr) console.error(`Extended Update Failed for ${newId}:`, extErr.message);
                }

                // Step 2: Update Dependencies
                const { error: updateErr } = await supabase
                    .from('service_attendance')
                    .update({ member_id: newId })
                    .eq('member_id', oldId);

                if (updateErr) {
                    console.error(`Dependency Update Failed for ${oldId}:`, updateErr.message);
                    await supabase.from('members').delete().eq('id', newId);
                    await supabase.from('members').update({ name: m.name }).eq('id', oldId);
                    continue;
                }

                // Step 3: Delete Old Member
                const { error: deleteErr } = await supabase
                    .from('members')
                    .delete()
                    .eq('id', oldId);

                if (deleteErr) {
                    console.error(`Delete Old Failed for ${oldId}:`, deleteErr.message);
                } else {
                    // Success - Log Mapping
                    mapping.push({ legacy_id: oldId, new_id: newId, migrated_at: new Date().toISOString() });
                }

            } catch (e: any) {
                console.error(`Exception on ${oldId}:`, e.message);
            }
        }

        // Save mapping periodically
        fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

        totalProcessed += members.length;
        console.log(`Total processed: ${totalProcessed}`);

        await new Promise(r => setTimeout(r, 100)); // Pause
    }

    console.log(`Migration Complete. Mapping saved to ${MAPPING_FILE}`);
}

runJsonMigration();
