
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
    console.log('--- GENERATING FIRST TIMERS EXCEL REPORT (Refined) ---');

    // 1. Fetch ALL Members joined in 2026
    const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .not('category', 'in', '("Next Gen","Child","Children")')
        .gte('joined_date', '2026-01-01')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching members:', error.message);
        return;
    }

    if (!members || members.length === 0) {
        console.log('No members found.');
        return;
    }

    // REFINE FILTER:
    // User wants "First Timers" AND "Promoted Members".
    // "Promoted Member" means they have a First Timer history (first_timer_service_id is not null).
    // "Direct Member" means they were added as Member directly (first_timer_service_id is null) -> EXCLUDE these.

    const filteredMembers = members.filter(m =>
        m.category === 'First Timer' ||
        (m.first_timer_service_id !== null && m.first_timer_service_id !== undefined)
    );

    if (!filteredMembers || filteredMembers.length === 0) {
        console.log('No matching members found after strict filter.');
        return;
    }

    console.log(`Found ${filteredMembers.length} Verified First Timers (excluding Direct Members).`);

    // 2. Format Data for Excel
    const reportData = filteredMembers.map(m => ({
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
        'Category': m.category, // Will show 'Member' for promoted ones, but context explains it.
        'Attendance Count': m.attended_service_ids ? m.attended_service_ids.length : 0
    }));

    // 3. Create Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);

    const colWidths = Object.keys(reportData[0]).map(key => ({ wch: 20 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "First Timers");

    // 4. Save to User's Download Folder
    const userDocsPath = 'C:\\Users\\Abraham\\Downloads\\Documents';

    if (!fs.existsSync(userDocsPath)) {
        try {
            fs.mkdirSync(userDocsPath, { recursive: true });
        } catch (e) {
            console.error(`Could not create directory: ${e.message}`);
            return;
        }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `First_Timers_List_Refined_${timestamp}.xlsx`;
    const fullPath = path.join(userDocsPath, fileName);

    try {
        XLSX.writeFile(wb, fullPath);
        console.log(`✅ Success! Report saved to: ${fullPath}`);
    } catch (e) {
        console.error(`Error writing file: ${e.message}`);
    }
}

generateReport();
