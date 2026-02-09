
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectS378() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378 UUID
    // Alternate legacy ID if needed
    const legacyId = 'S378';

    console.log(`--- Inspecting S378 ---`);

    try {
        // 1. Get Attendance for UUID
        const { data: attendanceUUID, error: attErrorUUID } = await supabase
            .from('service_attendance')
            .select('*')
            .eq('service_id', serviceId);

        if (attErrorUUID) throw attErrorUUID;
        console.log(`Attendance (UUID): ${attendanceUUID.length}`);

        // 2. Get Attendance for Legacy ID
        const { data: attendanceLegacy, error: attErrorLegacy } = await supabase
            .from('service_attendance')
            .select('*')
            .eq('service_id', legacyId);

        if (attErrorLegacy) throw attErrorLegacy;
        console.log(`Attendance (Legacy): ${attendanceLegacy.length}`);

        const allAttendance = [...(attendanceUUID || []), ...(attendanceLegacy || [])];
        console.log(`Total Combined: ${allAttendance.length}`);

        if (allAttendance.length === 0) return;

        const memberIds = allAttendance.map(a => a.member_id);
        const uniqueMemberIds = [...new Set(memberIds)];
        console.log(`Unique Members: ${uniqueMemberIds.length}`);

        // 3. Get Member Details
        const { data: members, error: memError } = await supabase
            .from('members')
            .select('id, name, category, age_group')
            .in('id', uniqueMemberIds);

        if (memError) throw memError;

        console.log(`Members Found in DB: ${members.length}`);

        // 4. Analyze
        let childrenCount = 0;
        let firstTimerCount = 0;
        const categories = {};

        members.forEach(m => {
            const cat = m.category || 'Unknown';
            categories[cat] = (categories[cat] || 0) + 1;

            if (cat.toLowerCase().includes('child') || m.age_group === '0-12') {
                childrenCount++;
            }
            if (cat === 'First Timer') {
                firstTimerCount++;
            }
        });

        console.log('Categories:', categories);
        console.log(`Calculated Children Count: ${childrenCount}`);
        console.log(`Calculated First Timer Count: ${firstTimerCount}`);

    } catch (err) {
        console.error('Error:', err.message);
    }
}

inspectS378();
