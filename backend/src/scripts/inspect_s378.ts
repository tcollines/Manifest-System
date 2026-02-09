
// @ts-nocheck
import { supabase } from '../../supabase';

export const inspectS378 = async () => {
    console.log('--- Inspecting S378 Data (from src) ---');
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76'; // S378

    try {
        // 1. Check Attendance
        const { data: attendance, error: attError } = await supabase
            .from('service_attendance')
            .select('*')
            .eq('service_id', serviceId);

        if (attError) throw attError;
        console.log(`Utilization: ${attendance?.length} records found in service_attendance.`);

        if (!attendance || attendance.length === 0) return;

        const memberIds = attendance.map(a => a.member_id);

        // 2. Check Members
        const { data: members, error: memError } = await supabase
            .from('members')
            .select('id, name, category, age_group')
            .in('id', memberIds);

        if (memError) throw memError;
        console.log(`Members: ${members?.length} found in members table.`);

        const categories: Record<string, number> = {};
        members?.forEach(m => {
            const cat = m.category || 'Unknown';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        console.log('Category Distribution:', categories);

        // 3. Check Ministry Event Stats
        const { data: event, error: evtError } = await supabase
            .from('ministry_events')
            .select('*')
            .eq('id', serviceId)
            .single();

        if (evtError && evtError.code !== 'PGRST116') throw evtError;

        if (event) {
            console.log('Event Stats:', JSON.stringify(event.stats, null, 2));
        } else {
            console.log('Event not found in ministry_events.');
        }

    } catch (err: any) {
        console.error('Inspection Error:', err.message);
    }
    process.exit(0);
};

inspectS378();
