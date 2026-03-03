require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAllUab() {
    const { data, error } = await supabase.from('vehicles')
        .select('id, number_plate, event_id, created_at, approvals, finance_details')
        .ilike('number_plate', '%123M%');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Matching License Plates Found: ${data.length}`);
    data.forEach(v => {
        console.log(`\n- ${v.number_plate}`);
        console.log(`  Event ID: ${v.event_id}`);
        console.log(`  Created: ${v.created_at}`);
        console.log(`  Approvals:`, v.approvals);
        console.log(`  Finance Details:`, v.finance_details);
    });
}

checkAllUab();
