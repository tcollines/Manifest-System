
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { return; }

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateReport() {
    console.log('--- GENERATING FINAL RECONCILED REPORT ---');

    // 1. Get all 2026 SERVICES (Exclude 'Event' type)
    const { data: events } = await supabase
        .from('ministry_events')
        .select('id, legacy_id, date, type, title')
        .gte('date', '2026-01-01')
        .neq('type', 'Event'); // As requested: "dont include events, only first timers for services"

    const eventIds = events.map(e => e.id);
    const legacyIds = events.map(e => e.legacy_id).filter(id => id);

    console.log(`Found ${events.length} Services in 2026 (Excluded Events).`);
    events.forEach(e => console.log(`Included: ${e.title} (${e.type})`));

    // 2. Strategy: Union of 3 sources
    // A. Members joined >= 2026-01-01 (Verified 78)
    // B. Members with first_timer_service_id IN (2026 Events)
    // C. Members in service_attendance linked to 2026 Events (Standard or Legacy)

    const allMembersMap = new Map();

    // Fetch A & B (Standard Props)
    const { data: membersAB, error: errAB } = await supabase
        .from('members')
        .select('*')
        .not('category', 'in', '("Next Gen","Child","Children")');

    if (errAB) { console.error(errAB); return; }

    // Filter A & B in memory to allow complex OR
    membersAB.forEach(m => {
        const joined2026 = m.joined_date >= '2026-01-01';
        const linkedTo2026 = eventIds.includes(m.first_timer_service_id);

        // Also checks if category is First Timer OR if it's a promoted member (implied by joined date or link)
        // User wants "All First Timers" (inclusive of promoted ones from this period)
        if (joined2026 || linkedTo2026) {
            allMembersMap.set(m.id, m);
        }
    });

    // Fetch C (Attendance Links including Legacy)
    // We need to find member_ids from service_attendance
    // .or(`service_id.in.(${eventIds}),legacy_service_id.in.(${legacyIds})`) // Syntax tricky with arrays in OR
    // Let's do two queries for safety

    let attendedMemberIds = [];

    // C1. Standard ID match
    if (eventIds.length > 0) {
        const { data: attStandard } = await supabase
            .from('service_attendance')
            .select('member_id')
            .in('service_id', eventIds);
        if (attStandard) attendedMemberIds.push(...attStandard.map(a => a.member_id));
    }

    // C2. Legacy ID match
    if (legacyIds.length > 0) {
        const { data: attLegacy } = await supabase
            .from('service_attendance')
            .select('member_id')
            .in('legacy_service_id', legacyIds);
        if (attLegacy) attendedMemberIds.push(...attLegacy.map(a => a.member_id));
    }

    // Unique IDs from attendance
    const uniqueAttendedIds = [...new Set(attendedMemberIds)];
    console.log(`Found ${uniqueAttendedIds.length} members via Attendance Link.`);

    // Fetch details for these attendees (if not already in map)
    const missingIds = uniqueAttendedIds.filter(id => !allMembersMap.has(id));

    if (missingIds.length > 0) {
        const { data: membersC } = await supabase
            .from('members')
            .select('*')
            .in('id', missingIds)
            .not('category', 'in', '("Next Gen","Child","Children")');

        if (membersC) {
            membersC.forEach(m => allMembersMap.set(m.id, m));
        }
    }

    const finalMembers = Array.from(allMembersMap.values());
    console.log(`Final Combined Count: ${finalMembers.length}`);

    // EXCLUDE DIRECT MEMBERS (per previous check, if they lack context? No, user wanted them included if they are "First Timers who became Members")
    // Previous "Direct Member" exclusion was because they were suspiciously 100 round number. 
    // But if we are reconciling total, and they joined in 2026, they ARE new members. 
    // "First Timer" list usually implies "People new to the church". 
    // If they joined as "Member" directly, they are still "New".
    // I will INCLUDE them but maybe mark them? No, user just wants the list.
    // I will include everyone who joined in 2026 or attended their first service in 2026.

    // Sort
    finalMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // 3. Generate Excel
    const reportData = finalMembers.map(m => ({
        'Full Name': m.name || '',
        'Phone': m.phone || m.contact || '',
        'Gender': m.gender || '',
        'Residence': m.residency || '',
        'Occupation': m.occupation || '',
        'Place of Work': m.place_of_work || '',
        'Born Again': m.born_again || m.is_born_again || 'No',
        'Is Phaneroo Member': m.is_phaneroo_member || 'No',
        'Referral Source': m.referral_source || '',
        'Email': m.email || '',
        'Joined Date': m.joined_date || m.created_at ? new Date(m.joined_date || m.created_at).toLocaleDateString() : '',
        'Marital Status': m.marital_status || '',
        'Prayer Request': m.prayer_requests || '',
        'LGA': m.lga || '',
        'Category': m.category,
        'Attendance Count': m.attended_service_ids ? m.attended_service_ids.length : 0,
        'Data Source': m.first_timer_service_id ? 'First Timer Flow' : (m.category === 'First Timer' ? 'Form' : 'Direct Add/Legacy')
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    const colWidths = Object.keys(reportData[0]).map(key => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, "Reconciled List");

    const userDocsPath = 'C:\\Users\\Abraham\\Downloads\\Documents';
    if (!fs.existsSync(userDocsPath)) fs.mkdirSync(userDocsPath, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `First_Timers_Reconciled_2026_${timestamp}.xlsx`;
    const fullPath = path.join(userDocsPath, fileName);

    try {
        XLSX.writeFile(wb, fullPath);
        console.log(`✅ Success! Saved to: ${fullPath}`);
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

generateReport();
