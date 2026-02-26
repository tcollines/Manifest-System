
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- CHECK DATE DIST ---');
    const { data: members } = await supabase
        .from('members')
        .select('joined_date')
        .not('category', 'in', '("Next Gen","Child","Children")')
        .gte('joined_date', '2026-01-01')
        .order('joined_date', { ascending: true });

    // Filter logic same as report
    // (Category='First Timer') OR (History exists)
    // Actually, report logic was:
    // const filteredMembers = members.filter(m => m.category === 'First Timer' || (m.first_timer_service_id !== null));
    // But I don't have category/ft_id in select above. fixing select.

    // Retrying with full select to match report logic exactly
}

async function checkReal() {
    const { data: members } = await supabase
        .from('members')
        .select('*')
        .not('category', 'in', '("Next Gen","Child","Children")')
        .gte('joined_date', '2026-01-01');

    const filtered = members.filter(m =>
        m.category === 'First Timer' ||
        (m.first_timer_service_id !== null && m.first_timer_service_id !== undefined)
    );

    const dist = {};
    filtered.forEach(m => {
        const month = m.joined_date.substring(0, 7); // YYYY-MM
        dist[month] = (dist[month] || 0) + 1;
    });

    console.log('Date Distribution of Report Members:', dist);
}

checkReal();
