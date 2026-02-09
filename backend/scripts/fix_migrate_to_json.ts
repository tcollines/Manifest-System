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

async function runRobustMigration() {
    console.log('Starting Robust Migration (JSON Mode + Merge Logic)...');

    let mapping: any[] = [];
    if (fs.existsSync(MAPPING_FILE)) {
        try {
            mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
        } catch (e) {
            console.warn('Mapping file corrupted or empty, starting fresh batch.');
        }
    }

    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
        // 1. Fetch Batch
        const { data: members, error } = await supabase
            .from('members')
            .select('*')
            .ilike('id', 'm-%')
            .not('name', 'ilike', '%_MIGRATION_%') // CRITICAL: Don't re-process stuck renames
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
                // Step 0: Rename Old Member (Free up Name+Phone constraint)
                const tempName = `${m.name}_MIGRATION_${oldId.substring(0, 4)}`;
                const { error: renameErr } = await supabase
                    .from('members')
                    .update({ name: tempName })
                    .eq('id', oldId);

                if (renameErr) {
                    console.error(`Rename Failed for ${oldId}:`, renameErr.message);
                    continue;
                }

                // Sanitize check_in_time
                let checkInTime = m.check_in_time;
                if (checkInTime) {
                    // Try to parse as is
                    const d = new Date(checkInTime);
                    if (!isNaN(d.getTime())) {
                        checkInTime = d.toISOString();
                    } else {
                        // Try prepending today's date if it looks like time
                        const today = new Date().toISOString().split('T')[0];
                        const d2 = new Date(`${today} ${checkInTime}`);
                        if (!isNaN(d2.getTime())) {
                            checkInTime = d2.toISOString();
                        } else {
                            // Fallback to null if unparseable
                            checkInTime = null;
                        }
                    }
                }

                // Sanitize Gender
                let gender = m.gender;
                if (gender && !['Male', 'Female'].includes(gender)) {
                    // Try to map M/F?
                    if (gender.startsWith('M')) gender = 'Male';
                    else if (gender.startsWith('F')) gender = 'Female';
                    else gender = null; // Invalid
                }

                // Sanitize Born Again
                let bornAgain = m.born_again;
                if (bornAgain && !['Yes', 'No'].includes(bornAgain)) {
                    if (bornAgain.toLowerCase() === 'true') bornAgain = 'Yes';
                    else if (bornAgain.toLowerCase() === 'false') bornAgain = 'No';
                    else bornAgain = 'No'; // Default to No if unknown/invalid? Or null?
                }

                // Sanitize Status
                let status = m.status;
                const validStatuses = ['Active', 'Absent', 'Review', 'Archived', 'Late']; // Add more if known
                if (status && !validStatuses.includes(status)) {
                    // Try to capitalize
                    status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
                    if (!validStatuses.includes(status)) status = 'Active'; // Default? or keep as is and hope?
                    // Safe default: 'Active'
                }

                // Step 1: Create New Member via RPC
                const rpcPayload = {
                    _id: newId,
                    _name: m.name,
                    _category: m.category,
                    _phone: m.phone,
                    _status: status,
                    _check_in_time: checkInTime,
                    _gender: gender,
                    _residency: m.residency,
                    _born_again: bornAgain,
                    _joined_date: m.joined_date,
                    _attended_service_ids: m.attended_service_ids || [],
                    _current_service_id: null
                };

                const { error: createErr } = await supabase.rpc('submit_member_entry', rpcPayload);
                let targetId = newId;

                if (createErr) {
                    console.error(`RPC Create Failed for ${oldId}: ${createErr.message}`);
                    // If it fails even after dropping index, something else is wrong.
                    // We'll rename it back and move on to next batch.
                    await supabase.from('members').update({ name: m.name }).eq('id', oldId);
                    continue;
                }

                // Step 1b: Extended Updates (Only if we created NEW member - or should we update existing? Maybe not overwrite existing data)
                if (targetId === newId) {
                    const extendedUpdates: any = {};
                    if (m.occupation) extendedUpdates.occupation = m.occupation;
                    if (m.place_of_work) extendedUpdates.place_of_work = m.place_of_work;
                    if (m.email) extendedUpdates.email = m.email;
                    if (m.is_phaneroo_member) extendedUpdates.is_phaneroo_member = m.is_phaneroo_member;
                    if (m.referral_source) extendedUpdates.referral_source = m.referral_source;

                    if (Object.keys(extendedUpdates).length > 0) {
                        await supabase.from('members').update(extendedUpdates).eq('id', newId);
                    }
                }

                // Step 2: Merge Service Attendance (Handle Duplicates)
                // 2a. Get all attendance for OLD ID
                const { data: attendance, error: attErr } = await supabase
                    .from('service_attendance')
                    .select('service_id, check_in_time')
                    .eq('member_id', oldId);

                if (attErr) {
                    console.error(`Fetch Attendance Failed for ${oldId}:`, attErr.message);
                    // Rollback if we created newId
                    if (targetId === newId) await supabase.from('members').delete().eq('id', newId);
                    await supabase.from('members').update({ name: m.name }).eq('id', oldId);
                    continue;
                }

                if (attendance && attendance.length > 0) {
                    for (const att of attendance) {
                        // Check if NEW ID already has this service? (It shouldn't, unless duplicate in source batch)
                        // But just in case, we try Update. If Update fails (Unique Constraint), we Delete the OLD record.

                        const { error: updateAttErr } = await supabase
                            .from('service_attendance')
                            .update({ member_id: targetId })
                            .eq('member_id', oldId)
                            .eq('service_id', att.service_id);
                        // Note: Update by composite key to be precise

                        if (updateAttErr) {
                            // Likely Duplicate Key. Delete the OLD record (it's redundant now, or conflicted)
                            // Wait, if it failed, New ID didn't take it.
                            // Did New ID already exist?
                            // We can check or just DELETE the old one if update fails assume duplicate.
                            // "If update fails due to constraint, delete the source row"
                            const { error: delAttErr } = await supabase
                                .from('service_attendance')
                                .delete()
                                .eq('member_id', oldId)
                                .eq('service_id', att.service_id);

                            if (delAttErr) console.error(`Failed to handle duplicate attendance ${oldId}/${att.service_id}:`, delAttErr.message);
                        }
                    }
                }

                // Step 3: Delete Old Member
                const { error: deleteErr } = await supabase.from('members').delete().eq('id', oldId);

                if (deleteErr) {
                    console.error(`Delete Old Failed for ${oldId}:`, deleteErr.message);
                    // Partial state...
                } else {
                    mapping.push({ legacy_id: oldId, new_id: targetId, migrated_at: new Date().toISOString() });
                }

            } catch (e: any) {
                console.error(`Exception on ${oldId}:`, e.message);
            }
        }

        fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

        totalProcessed += members.length;
        console.log(`Total processed: ${totalProcessed}`);

        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`Migration Complete. Mapping saved to ${MAPPING_FILE}`);
}

runRobustMigration();
