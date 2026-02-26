
// @ts-nocheck
import { supabase } from '../src/supabase';

export const checkScope = async () => {
    console.log('--- Database Integrity: Scope Check ---');

    try {
        // 1. Fetch ALL attendance records (limited to relevant columns for perf)
        // Note: For 2358 rows, this is fine. If table is huge, we might need a stored proc or careful chunking.
        // But we need to define "broken".
        // "LEFT JOIN members m ON m.id = sa.member_id WHERE m.id IS NULL"
        // We can't easily do a left join with null check via standard PostgREST-js cleanly for *discovery* without fetching.
        // Strategy: Fetch all unique member_ids from service_attendance, then check which are missing in members.

        console.log('Fetching all Service Attendance IDs...');
        // Using distinct count strategy if possible, or just fetching all member_ids.
        // Let's page through attendance to get all member_ids.

        let allAttendance: { id: string, member_id: any, service_id: string }[] = [];
        const pageSize = 1000;
        let page = 0;

        while (true) {
            const { data, error } = await supabase
                .from('service_attendance')
                .select('id, member_id, service_id')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;

            allAttendance = allAttendance.concat(data);
            page++;
            if (data.length < pageSize) break;
        }

        console.log(`Total Attendance Rows: ${allAttendance.length}`);

        const distinctMemberIds = [...new Set(allAttendance.map(a => a.member_id))];
        console.log(`Unique Member IDs in Attendance: ${distinctMemberIds.length}`);

        // 2. Check validity of these IDs against Members table
        // We will fetch all valid member IDs from members table.
        // Assuming members table isn't massive (e.g. < 50k). If it is, we need a smarter way.
        // Based on previous context, we have ~130-900 members? 
        // Let's just fetch all member IDs.

        let validMemberIds = new Set();
        page = 0;
        while (true) {
            const { data, error } = await supabase
                .from('members')
                .select('id')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;

            data.forEach(m => validMemberIds.add(m.id));
            page++;
            if (data.length < pageSize) break;
        }

        console.log(`Total Valid Member IDs: ${validMemberIds.size}`);

        // 3. Identify Broken Rows
        const brokenRows = allAttendance.filter(a => !validMemberIds.has(a.member_id));
        console.log(`BROKEN ROWS COUNT: ${brokenRows.length}`);

        if (brokenRows.length === 0) {
            console.log('No broken rows found.');
            return;
        }

        // 4. Analyze Broken IDs
        let nullParams = 0;
        let legacyParams = 0; // Starts with M- or similar?
        let uuidParams = 0;   // Is UUID formatted?
        let otherParams = 0;
        let distinctBrokenIds = new Set(brokenRows.map(b => b.member_id));

        console.log(`Unique Broken IDs: ${distinctBrokenIds.size}`);

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        distinctBrokenIds.forEach(id => {
            if (id === null || id === undefined || id === 'null') {
                nullParams++;
            } else if (typeof id === 'string' && uuidRegex.test(id)) {
                uuidParams++;
            } else if (typeof id === 'string' && (id.startsWith('M-') || !isNaN(Number(id)))) {
                legacyParams++;
            } else {
                otherParams++;
            }
        });

        console.log('--- Breakdown of Broken IDs (Unique Values) ---');
        console.log(`NULLs: ${nullParams}`);
        console.log(`UUIDs (orphaned): ${uuidParams}`);
        console.log(`Legacy/Numeric: ${legacyParams}`);
        console.log(`Other: ${otherParams}`);

        // Sample
        console.log('--- Sample Broken Rows ---');
        brokenRows.slice(0, 5).forEach(r => {
            console.log(`Att ID: ${r.id} | Svc: ${r.service_id} | Bad Member ID: ${r.member_id}`);
        });

    } catch (err: any) {
        console.error('Error:', err.message);
    }
    process.exit(0);
};

checkScope();
