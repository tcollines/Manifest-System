
import { supabase } from '../src/supabase';
import * as fs from 'fs';
import * as path from 'path';

// Files
const REPAIR_MAP_FILE = path.join(__dirname, 'final_repair_map.json');
const UNRESOLVABLE_FILE = path.join(__dirname, 'unresolvable_orphans.json');

async function repair() {
    console.log('Starting comprehensive service_attendance repair...');

    // 1. Load Data
    if (!fs.existsSync(REPAIR_MAP_FILE) || !fs.existsSync(UNRESOLVABLE_FILE)) {
        console.error('Missing repair map or unresolvable report.');
        return;
    }

    const repairMap = new Map<string, string>();
    JSON.parse(fs.readFileSync(REPAIR_MAP_FILE, 'utf-8')).forEach((i: any) => {
        repairMap.set(i.orphan_id.toLowerCase(), i.target_id);
    });

    const unresolvableList = JSON.parse(fs.readFileSync(UNRESOLVABLE_FILE, 'utf-8'));
    const toCreate = new Map<string, any>(); // OrphanID -> Identity
    const toDelete = new Set<string>(); // OrphanID

    unresolvableList.forEach((u: any) => {
        const id = u.orphan_id.toLowerCase();
        if (typeof u.identity === 'object' && u.identity.name && u.identity.name !== 'UNKNOWN') {
            toCreate.set(id, u.identity);
        } else if (u.identity === 'UNKNOWN' || u.identity === undefined) {
            toDelete.add(id);
        }
    });

    console.log(`Loaded:`);
    console.log(`- Direct Repairs: ${repairMap.size} unique orphans`);
    console.log(`- To Create: ${toCreate.size} unique members`);
    console.log(`- To Delete: ${toDelete.size} unique ghost orphans`);


    // 2. Fetch Broken Records
    console.log('Fetching all service_attendance records to filter broken ones...');
    let allAttendance = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
        const { data, error } = await supabase
            .from('service_attendance')
            .select('id, member_id')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        allAttendance.push(...data);
        page++;
    }
    console.log(`Scanned ${allAttendance.length} total attendance records.`);

    // 3. Verify Validity (Get existing member IDs to double check)
    // Optimization: We could skip this if we trust the previous step, but let's be safe.
    // Actually, we can just rely on our maps since they were built against the DB.
    // But we need to know WHICH rows are broken.
    // Let's filter `allAttendance` for rows that are NOT in a valid member list?
    // Or just check if they are in our "bad" lists.

    // Better: Fetch all valid member IDs to confirm brokenness.
    console.log('Fetching valid member IDs...');
    const validMemberIds = new Set<string>();
    page = 0;
    while (true) {
        const { data, error } = await supabase.from('members').select('id').range(page * pageSize, (page + 1) * pageSize - 1);
        if (!data || data.length === 0) break;
        data.forEach(m => validMemberIds.add(m.id));
        page++;
    }
    console.log(`Valid Members: ${validMemberIds.size}`);

    const brokenRows = allAttendance.filter(r => !validMemberIds.has(r.member_id));
    console.log(`Confirmed Broken Rows: ${brokenRows.length}`);


    // 4. ACTION 1: Direct Repairs (Map Update)
    let updateCount = 0;
    const updates = [];

    for (const row of brokenRows) {
        const mid = row.member_id.toLowerCase();
        if (repairMap.has(mid)) {
            updates.push({ id: row.id, member_id: repairMap.get(mid) });
        }
    }

    if (updates.length > 0) {
        console.log(`Executing ${updates.length} direct map updates...`);
        for (let i = 0; i < updates.length; i += 100) {
            const batch = updates.slice(i, i + 100);
            const { error } = await supabase.from('service_attendance').upsert(batch).select();
            if (error) console.error('Update match failed:', error);
            else updateCount += batch.length;
            process.stdout.write('.');
        }
        console.log('\nDirect updates done.');
    }


    // 5. ACTION 2: Create New Members
    console.log(`Creating ${toCreate.size} new members...`);
    const createdMap = new Map<string, string>(); // OrphanID -> NewRealID
    let createdCount = 0;

    // We need to create members sequentially or in small batches to get IDs back
    for (const [oid, identity] of toCreate.entries()) {
        // Insert member
        const newMember = {
            name: identity.name,
            phone_number: identity.phone || null,
            // defaults
            status: 'active',
            category: 'member'
        };

        const { data, error } = await supabase
            .from('members')
            .insert(newMember)
            .select('id')
            .single();

        if (error) {
            console.error(`Failed to create member ${identity.name}:`, error.message);
        } else if (data) {
            createdMap.set(oid, data.id);
            createdCount++;
        }
    }
    console.log(`Successfully created ${createdCount} members.`);

    // Now update attendance rows for these created members
    const creationUpdates = [];
    for (const row of brokenRows) {
        const mid = row.member_id.toLowerCase();
        if (createdMap.has(mid)) {
            creationUpdates.push({ id: row.id, member_id: createdMap.get(mid) });
        }
    }

    if (creationUpdates.length > 0) {
        console.log(`Linking ${creationUpdates.length} rows to new members...`);
        for (let i = 0; i < creationUpdates.length; i += 100) {
            const batch = creationUpdates.slice(i, i + 100);
            const { error } = await supabase.from('service_attendance').upsert(batch).select();
            if (error) console.error('Link new member failed:', error);
            process.stdout.write('.');
        }
        console.log('\nLinking done.');
    }


    // 6. ACTION 3: Delete Ghost Records
    const deleteIds = [];
    for (const row of brokenRows) {
        const mid = row.member_id.toLowerCase();
        // If it's in the delete set AND wasn't repaired by previous steps (sanity check)
        if (toDelete.has(mid) && !repairMap.has(mid) && !createdMap.has(mid)) {
            deleteIds.push(row.id);
        }
    }

    if (deleteIds.length > 0) {
        console.log(`Deleting ${deleteIds.length} ghost rows...`);
        // Supabase split delete
        for (let i = 0; i < deleteIds.length; i += 100) {
            const batch = deleteIds.slice(i, i + 100);
            const { error } = await supabase
                .from('service_attendance')
                .delete()
                .in('id', batch);

            if (error) console.error('Delete failed:', error);
            process.stdout.write('x');
        }
        console.log('\nDeletion done.');
    }

    console.log('REPAIR COMPLETE.');
}

repair().catch(console.error);
