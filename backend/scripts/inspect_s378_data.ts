
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectS378() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378 UUID
    const serviceDate = '2026-02-08';

    console.log(`--- Inspecting S378 (${serviceId}) ---`);

    // 1. Get Attendance
    const { data: attendance, error: attError } = await supabase
        .from('service_attendance')
        .select('*')
        .eq('service_id', serviceId);

    if (attError) {
        console.error('Error fetching attendance:', attError);
        return;
    }

    console.log(`Total Attendance Records: ${attendance?.length}`);

    if (!attendance || attendance.length === 0) return;

    const memberIds = attendance.map(a => a.member_id);

    // 2. Get Member Details
    const { data: members, error: memError } = await supabase
        .from('members')
        .select('id, name, category, joined_date, age_group') // requesting age_group just in case
        .in('id', memberIds);

    if (memError) {
        console.error('Error fetching members:', memError);
        return;
    }

    console.log(`Total Members Found: ${members?.length}`);

    // 3. Analyze Categories
    const categories: Record<string, number> = {};
    const ageGroups: Record<string, number> = {};

    members?.forEach(m => {
        const cat = m.category || 'Uncategorized';
        categories[cat] = (categories[cat] || 0) + 1;

        const ag = m.age_group || 'No Age Group';
        ageGroups[ag] = (ageGroups[ag] || 0) + 1;
    });

    console.log('\nCategory Distribution:');
    console.log(categories);

    console.log('\nAge Group Distribution:');
    console.log(ageGroups);

    // 4. Sample check for "Children" logic
    // Assuming "Child" category or Age Group 0-12 etc.
    const children = members?.filter(m =>
        m.category?.toLowerCase() === 'child' ||
        m.category?.toLowerCase() === 'children' ||
        m.age_group === '0-12' // Hypothetical
    );

    console.log(`\nPotential Children Count (Category 'Child'/'Children'): ${children?.length}`);

    // Dump first 5 members
    console.log('\nFirst 5 Members:');
    console.log(JSON.stringify(members?.slice(0, 5), null, 2));
}

inspectS378();
