
// @ts-nocheck
import { supabase } from '../src/supabase';

export const repair = async () => {
    console.log('--- Database Integrity: REPAIR ---');

    try {
        // 1. Fetch Broken Rows again (Filter by those valid-looking legacy IDs)
        // We know they are strings, likely starting with M- or numbers.
        // Efficient way: Fetch all attendance, filter like before.

        console.log('Fetching all Service Attendance...');
        let allAttendance: { id: string, member_id: string, service_id: string }[] = [];
        const pageSize = 1000;
        let page = 0;
        while (true) {
            const { data, error } = await supabase
                .from('service_attendance')
                .select('id, member_id, service_id')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            if (!data || data.length === 0) break;
            allAttendance = allAttendance.concat(data);
            page++;
            if (data.length < pageSize) break;
        }

        // 2. Fetch All Members with Legacy IDs
        console.log('Fetching Members with Legacy IDs...');
        let membersMap = new Map(); // LegacyID -> UUID
        page = 0;
        while (true) {
            const { data, error } = await supabase
                .from('members')
                .select('id, legacy_id')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            if (!data || data.length === 0) break;

            data.forEach(m => {
                if (m.legacy_id) membersMap.set(m.legacy_id.toString(), m.id);
                // Also map the ID itself if it matches the legacy pattern? No, strict mapping.
            });
            page++;
            if (data.length < pageSize) break;
        }
        console.log(`Loaded ${membersMap.size} legacy mappings.`);

        // 3. Identify Repairable Rows
        // We also need the Set of Valid UUIDs to know which rows are BROKEN.
        // Optimization: We can just check which attendance.member_id exists in membersMap as a Key.
        // If member_id is already a UUID, it won't be in membersMap keys (which are M-123).

        let toRepair = [];
        let unrepairable = [];

        allAttendance.forEach(a => {
            // If the member_id matches a known Legacy ID
            if (membersMap.has(a.member_id)) {
                toRepair.push({
                    attendance_id: a.id,
                    old_member_id: a.member_id,
                    new_member_id: membersMap.get(a.member_id)
                });
            } else {
                // It might be valid UUID or truly broken.
                // We are only repairing confirmed legacy matches.
            }
        });

        console.log(`Found ${toRepair.length} rows to repair.`);

        if (toRepair.length === 0) {
            console.log('Nothing to repair.');
            return;
        }

        // 4. Execution (Batch Update)
        // Supabase doesn't do bulk update easily efficiently without stored proc for different values.
        // We have to loop. 
        console.log('Starting Repair...');
        let successCount = 0;
        let failCount = 0;

        // Process in chunks or one by one
        // One by one is safer for audit logging.

        for (const item of toRepair) {
            const { error } = await supabase
                .from('service_attendance')
                .update({ member_id: item.new_member_id })
                .eq('id', item.attendance_id);

            if (error) {
                console.error(`Failed to repair Row ${item.attendance_id}: ${error.message}`);
                failCount++;
            } else {
                successCount++;
                if (successCount % 50 === 0) process.stdout.write('.');
            }
        }

        console.log('\nRepair Complete.');
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);

    } catch (err: any) {
        console.error('Error:', err.message);
    }
    process.exit(0);
};

repair();
