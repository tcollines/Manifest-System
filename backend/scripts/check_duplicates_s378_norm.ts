
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';

export const checkDuplicatesNorm = async () => {
    console.log('--- Checking Duplicates in S378 (Normalized) ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Get Attendance
    const { data: attendance } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    if (!attendance || attendance.length === 0) return;
    const attIds = new Set(attendance.map(a => a.member_id));
    console.log(`Attendance Records: ${attendance.length}`);

    // 2. Fetch Members
    // We fetch ALL members to be sure? No, only those in attendance.
    const memberIds = Array.from(attIds);
    let members: any[] = [];
    const chunkSize = 200;

    for (let i = 0; i < memberIds.length; i += chunkSize) {
        const chunk = memberIds.slice(i, i + chunkSize);
        const { data } = await supabase.from('members').select('id, name, phone, name_norm, phone_last9').in('id', chunk);
        if (data) members = members.concat(data);
    }
    console.log(`Members Loaded: ${members.length}`);

    // 3. Analyze
    const groups: Record<string, any[]> = {};
    members.forEach(m => {
        // Fallback if norms are null?
        const n = m.name_norm || m.name.toLowerCase().trim();
        const p = m.phone_last9 || (m.phone ? m.phone.replace(/\D/g, '').slice(-9) : 'unknown');

        const key = `${n}|${p}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
    });

    const duplicates = Object.entries(groups).filter(([k, list]) => list.length > 1);
    console.log(`Duplicate Groups Found: ${duplicates.length}`);

    let csvContent = '';
    duplicates.forEach(([key, list]) => {
        // Pair them up? Or just list them?
        // CSV format: original_id, original_name, original_phone, duplicate_id, duplicate_name, duplicate_phone
        // We pick the first as original, rest as duplicates
        const [original, ...dups] = list;
        dups.forEach(d => {
            csvContent += `${original.id},${original.name},${original.phone},${d.id},${d.name},${d.phone}\n`;
        });
    });

    if (csvContent) {
        fs.writeFileSync('d:/Manifest System/backend/scripts/duplicates_s378.csv', csvContent);
        console.log('CSV Written to duplicates_s378.csv');
        console.log(`Total Duplicate Relations: ${csvContent.trim().split('\n').length}`);
    }

    process.exit(0);
};

checkDuplicatesNorm();
