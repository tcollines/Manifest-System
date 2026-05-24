const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fetching existing departments...");
    
    const { data: depts, error: fetchErr } = await supabase.from('departments').select('*').limit(1);

    if (fetchErr) {
        console.error("Fetch failed:", fetchErr);
        return;
    }

    console.log("First department:", depts[0]);

    if (!depts || depts.length === 0) {
        console.log("No existing departments to copy manifest_id from.");
        return;
    }

    const manifestId = depts[0].manifest_id;
    console.log("Using manifest_id:", manifestId);

    const { data, error } = await supabase.from('departments').insert({
        id: 'd1100000-0000-0000-0000-000000000000',
        manifest_id: manifestId,
        name: 'Sales & Merchandise',
        slug: 'sales',
        description: 'Church Merchandise and Fulfillment',
        icon: 'ShoppingCart',
        is_custom: true,
        status: 'Active'
    }).select();

    if (error) {
        if (error.code === '23505') {
            console.log("Department already exists (unique constraint). It is fine.");
        } else {
            console.error("Insertion failed:", error);
        }
    } else {
        console.log("Insertion successful:", data);
    }
}

run();
