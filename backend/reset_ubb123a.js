require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://kdcypmsmrmqozqssnwhu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetVehicle() {
    const plate = 'UBB 123A';
    console.log(`Resetting vehicle ${plate} to Onboarding...`);

    const { data, error } = await supabase
        .from('vehicles')
        .update({
            current_stage: 'Onboarding',
            status: 'Pending'
        })
        .eq('number_plate', plate)
        .select();

    if (error) {
        console.error("Error updating:", error);
    } else {
        console.log("Success! Updated vehicles:", data);
    }
}

resetVehicle();
