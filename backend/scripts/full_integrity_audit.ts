
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';

export const audit = async () => {
    console.log('--- FULL INTEGRITY AUDIT ---');

    try {
        // 1. Fetch all Valid Member IDs
        let validMemberIds = new Set();
        let page = 0;
        const pageSize = 1000;

        while (true) {
            const { data, error } = await supabase.from('members').select('id').range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            data.forEach(m => validMemberIds.add(m.id));
            page++;
            if (data.length < pageSize) break;
        }
        console.log(`Total Valid Members: ${validMemberIds.size}`);

        // 2. Fetch all Attendance Records
        let brokenRows = [];
        page = 0;
        while (true) {
            const { data, error } = await supabase.from('service_attendance').select('*').range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;

            data.forEach(row => {
                if (!validMemberIds.has(row.member_id)) {
                    brokenRows.push(row);
                }
            });
            page++;
            if (data.length < pageSize) break;
        }

        console.log(`Total Attendance Checked: ${page * pageSize} (approx)`);
        console.log(`BROKEN ROWS FOUND: ${brokenRows.length}`);

        if (brokenRows.length > 0) {
            // Write breakdown to file
            const breakdown = {
                count: brokenRows.length,
                sample: brokenRows.slice(0, 10),
                unique_bad_ids: [...new Set(brokenRows.map(r => r.member_id))].slice(0, 20)
            };
            fs.writeFileSync('broken_rows_details.json', JSON.stringify(breakdown, null, 2));
            console.log('Details written to broken_rows_details.json');
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};

audit();
