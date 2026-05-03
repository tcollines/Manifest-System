import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fixRequisitions() {
    console.log("Updating FINANCE_BATCH to TL_APPROVAL...");
    const { data, error } = await supabase
        .from('requisitions')
        .update({ status: 'TL_APPROVAL' })
        .eq('status', 'FINANCE_BATCH');

    if (error) {
        console.error("Error updating:", error);
    } else {
        console.log("Successfully updated to TL_APPROVAL!");
    }
}

fixRequisitions();
