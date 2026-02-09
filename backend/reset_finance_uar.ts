
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function resetFinance() {
    console.log("Resetting Finance for UAR 234G...");

    const { data: vehicle } = await supabase.from('vehicles').select('id, finance_details').eq('number_plate', 'UAR 234G').single();
    if (!vehicle) {
        console.error("Vehicle not found.");
        return;
    }

    // Reset relevant fields to empty string to make it appear as "Pending/Ongoing"
    const resetDetails = {
        ...vehicle.finance_details,
        ongoingDispatch: "",
        ongoingBalance: "",
        returnDispatch: "",
        returnBalance: "",
        processedAt: null
    };

    const { error } = await supabase.from('vehicles').update({
        finance_details: resetDetails
    }).eq('id', vehicle.id);

    if (error) {
        console.error("Error updating vehicle:", error);
    } else {
        console.log("Vehicle finance details reset to empty. It should now appear in the 'Ongoing' tab.");
    }
}

resetFinance();
