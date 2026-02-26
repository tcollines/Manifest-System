
// @ts-nocheck
import { supabase } from '../src/supabase';

export const inspect = async () => {
    console.log('--- Inspecting S378 Data (Dupe Check) ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    try {
        // 1. Check UUID Attendance
        const { data: attUUID } = await supabase
            .from('service_attendance')
            .select('member_id')
            .eq('service_id', serviceId);

        console.log(`Total Attendance Records: ${attUUID?.length || 0}`);

        if (attUUID && attUUID.length > 0) {
            const ids = attUUID.map(a => a.member_id);

            // --- Chunked Fetch ---
            let allMembers: any[] = [];
            const chunkSize = 200;
            for (let i = 0; i < ids.length; i += chunkSize) {
                const chunk = ids.slice(i, i + chunkSize);
                const { data: chunkMembers, error } = await supabase
                    .from('members')
                    .select('id, name, phone, category')
                    .in('id', chunk);
                if (error) console.error('Chunk Error:', error);
                if (chunkMembers) allMembers = allMembers.concat(chunkMembers);
            }

            console.log(`Resolved Members: ${allMembers.length}`);

            // --- Duplicate Analysis ---
            const uniqueMap = new Map();
            const duplicates = [];
            const categories: Record<string, number> = {};

            allMembers.forEach(m => {
                const name = m.name ? m.name.trim().toLowerCase() : '';
                // Normalize phone: remove non-digits
                const phone = m.phone ? m.phone.replace(/\D/g, '') : '';

                if (!name) return; // ignore invalid names

                const key = `${name}|${phone}`;

                if (uniqueMap.has(key)) {
                    duplicates.push({ original: uniqueMap.get(key), duplicate: m });
                } else {
                    uniqueMap.set(key, m);
                    const cat = m.category || 'Unknown';
                    categories[cat] = (categories[cat] || 0) + 1;
                }
            });

            console.log(`Duplicates (Name+Phone): ${duplicates.length}`);
            console.log(`Unique Individuals: ${uniqueMap.size}`);
            console.log('Unique Categories:', categories);

            if (duplicates.length > 0) {
                console.log('--- Saving Duplicates to CSV ---');
                const fs = require('fs');
                const path = require('path');
                const csvContent = ['Original Name,Original ID,Original Phone,Duplicate Name,Duplicate ID,Duplicate Phone'].concat(
                    duplicates.map(d => `"${d.original.name}","${d.original.id}","${d.original.phone}","${d.duplicate.name}","${d.duplicate.id}","${d.duplicate.phone}"`)
                ).join('\n');

                fs.writeFileSync(path.resolve(__dirname, 'duplicates_s378.csv'), csvContent);
                console.log('Saved to duplicates_s378.csv');
            }

        }

    } catch (err: any) {
        console.error('Error:', err.message);
    }
    process.exit(0);
};

inspect();
