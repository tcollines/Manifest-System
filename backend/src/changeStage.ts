import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('Finding both vehicles...');
    const { data: oldVs } = await supabase.from('vehicles').select('*').eq('number_plate', 'UA 123ED-completed');
    const { data: newVs } = await supabase.from('vehicles').select('*').eq('number_plate', 'UA 123ED');

    if (!oldVs?.length || !newVs?.length) {
        console.error("Missing one of the vehicles.");
        return;
    }

    const oldId = oldVs[0].id;
    const newId = newVs[0].id;

    // 3. Move passengers over
    const { error: pErr, count } = await supabase.from('passengers').update({ vehicle_id: newId }).eq('vehicle_id', oldId);
    
    if (pErr) {
        console.error("Failed to move passengers:", pErr);
    } else {
        console.log("Successfully moved passengers! The UA 123ED is now ready in Return Leg - Reg. Verify.");
    }
}
run();
