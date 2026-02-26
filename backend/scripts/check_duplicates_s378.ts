

import { supabase } from '../src/supabase';


export const checkDuplicates = async () => {
    console.log('--- Checking Duplicates in S378 ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    try {
        // 1. Get all attendance records
        const { data: attendance } = await supabase
            .from('service_attendance')
            .select('member_id, check_in_time')
            .eq('service_id', serviceId);

        console.log(`Total Attendance Records: ${attendance?.length}`);

        if (!attendance || attendance.length === 0) return;

        const memberIds = attendance.map((a: any) => a.member_id);

        // 2. Fetch Member Details
        let members: any[] = [];
        const chunkSize = 200;
        for (let i = 0; i < memberIds.length; i += chunkSize) {
            const chunk = memberIds.slice(i, i + chunkSize);
            const { data: chunkMembers } = await supabase
                .from('members')
                .select('id, name, phone, category')
                .in('id', chunk);
            if (chunkMembers) members = members.concat(chunkMembers);
        }

        console.log(`Total Resolved Members: ${members.length}`);

        // 3. Analyze Duplicates (Name + Phone)
        const uniqueMap = new Map();
        const duplicates: any[] = [];

        members.forEach(m => {
            const name = m.name ? m.name.trim().toLowerCase() : 'unknown';
            let phone = m.phone ? m.phone.replace(/\D/g, '') : 'unknown';

            // Basic Uganda normalization: 07... -> 2567...
            if (phone.startsWith('0')) phone = '256' + phone.slice(1);

            const key = `${name}|${phone}`;
            if (uniqueMap.has(key)) {
                duplicates.push({
                    original: uniqueMap.get(key),
                    duplicate: m
                });
            } else {
                uniqueMap.set(key, m);
            }
        });

        console.log(`Potential Duplicates Found: ${duplicates.length}`);

        if (duplicates.length > 0) {
            console.log('--- Top 5 Duplicates ---');
            duplicates.slice(0, 5).forEach(d => {
                console.log(`Original: ${d.original.name} (${d.original.id})`);
                console.log(`Duplicate: ${d.duplicate.name} (${d.duplicate.id})`);
                console.log('---');
            });

            // Write CSV
            const csv = duplicates.map(d => `${d.original.id},${d.original.name},${d.original.phone},${d.duplicate.id},${d.duplicate.name},${d.duplicate.phone}`).join('\n');
            const fs = require('fs');
            fs.writeFileSync('d:/Manifest System/backend/scripts/duplicates_s378.csv', csv);
            console.log('CSV Written to d:/Manifest System/backend/scripts/duplicates_s378.csv');
        }

        // 4. Counts
        const validAdults = members.length;
        console.log(`Resolved Adult Count (Raw): ${validAdults}`);
        console.log(`Projected Unique Adult Count: ${validAdults - duplicates.length}`);

    } catch (err: any) {
        console.error('Error:', err.message);
    }
    process.exit(0);
};

checkDuplicates();
