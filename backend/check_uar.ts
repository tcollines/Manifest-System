
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkUAR() {
    console.log("Checking UAR 234G...");

    const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('id, number_plate, current_stage, approvals, finance_details, event_id, station_id')
        .eq('number_plate', 'UAR 234G')
        .single();

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Vehicle Data:");
    console.log("  ID:", vehicle.id);
    console.log("  Stage:", vehicle.current_stage);
    console.log("  Approvals:", vehicle.approvals);
    console.log("  Event ID:", vehicle.event_id);
    console.log("  Finance:", vehicle.finance_details);
}

checkUAR();
