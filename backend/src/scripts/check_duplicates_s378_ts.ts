
// @ts-nocheck
import { supabase } from '../../supabase';

export const checkDuplicates = async () => {
    console.log('--- Checking Duplicates in S378 (TS Src) ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    try {
        const { data: attendance } = await supabase
            .from('service_attendance')
            .select('member_id')
            .eq('service_id', serviceId);

        console.log(`Total Attendance Records: ${attendance?.length || 0}`);

        if (!attendance || attendance.length === 0) return;

        const memberIds = attendance.map(a => a.member_id);

        let members = [];
        const chunkSize = 200;
        for (let i = 0; i < memberIds.length; i += chunkSize) {
            const chunk = memberIds.slice(i, i + chunkSize);
            const { data: chunkMembers, error } = await supabase
                .from('members')
                .select('id, name, phone, category')
                .in('id', chunk);

            if (error) console.error(error);
            if (chunkMembers) members = members.concat(chunkMembers);
        }

        console.log(`Resolved Members: ${members.length}`);

        const uniqueMap = new Map();
        const duplicates = [];

        members.forEach(m => {
            if (!m) return;
            // Key by Name and Phone (normalized)
            const name = m.name ? m.name.trim().toLowerCase() : '';
            const phone = m.phone ? m.phone.replace(/\D/g, '') : '';

            // Skip empty
            if (!name) return;

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

        console.log(`Duplicates Found: ${duplicates.length}`);
        console.log(`Unique Count: ${uniqueMap.size}`);

        if (duplicates.length > 0) {
            console.log('--- Sample Duplicates ---');
            duplicates.slice(0, 5).forEach(d => {
                console.log(`Original: ${d.original.name} (${d.original.id})`);
                console.log(`Duplicate: ${d.duplicate.name} (${d.duplicate.id})`);
            });
        }

    } catch (err: any) {
        console.error('Error:', err.message);
    }
    process.exit(0);
};

checkDuplicates();
