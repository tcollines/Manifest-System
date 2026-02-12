
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- CHECK JAN LINKED DATES ---');

    // 1. Get Event (Legacy ID known? Let's get via date)
    const { data: events } = await supabase
        .from('ministry_events')
        .select('*')
        .eq('date', '2026-01-24');

    const event = events[0];
    console.log(`Event ID: ${event.id}, Legacy ID: ${event.legacy_id}`);

    // 2. Find members linked via EITHER standard UUID OR Legacy ID
    // We need to check both ways

    // A. Standard UUID Link
    const { data: uuidMembers } = await supabase
        .from('members')
        .select('id, name, joined_date')
        .eq('first_timer_service_id', event.id);

    console.log(`UUID Linked Members: ${uuidMembers.length}`);

    // B. Legacy Link (via service_attendance -> member link?)
    // Actually members table doesn't have legacy_first_timer_service_id usually.
    // But let's check if there are members who ATTENDED this service (via service_attendance table)
    // and are category 'First Timer'.

    const { data: attendance } = await supabase
        .from('service_attendance')
        .select('member_id')
        .or(`service_id.eq.${event.id},legacy_service_id.eq.${event.legacy_id}`);

    const memberIds = attendance.map(a => a.member_id).filter(id => id); // filter nulls
    console.log(`Attendance Records for Event: ${memberIds.length}`);

    if (memberIds.length > 0) {
        const { data: attMembers } = await supabase
            .from('members')
            .select('id, name, joined_date, category')
            .in('id', memberIds);

        console.log('--- Dates of Attending Members ---');
        console.table(attMembers);
    }
}

check();
