
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMismatch() {
    console.log('--- FIXING PARKING MISMATCH ---');
    const targetId = 'pv-1769011399030';

    // 1. Fetch current state
    const { data: vehicle, error: fetchError } = await supabase
        .from('personal_vehicles')
        .select('*')
        .eq('id', targetId)
        .single();

    if (fetchError) {
        console.error("Error fetching vehicle:", fetchError.message);
        return;
    }

    console.log("Current Record:", {
        id: vehicle.id,
        text_id: vehicle.current_service_id,
        uuid_id: vehicle.current_service_id_uuid
    });

    if (!vehicle.current_service_id) {
        console.error("Text ID is missing, cannot sync UUID from it.");
        return;
    }

    // 2. Update UUID to match Text (Assuming Text is source of truth here)
    const { error: updateError } = await supabase
        .from('personal_vehicles')
        .update({
            current_service_id_uuid: vehicle.current_service_id
        })
        .eq('id', targetId);

    if (updateError) {
        console.error("Update failed:", updateError.message);
    } else {
        console.log("SUCCESS: Synced UUID column to match Text column.");
    }
}

fixMismatch();
