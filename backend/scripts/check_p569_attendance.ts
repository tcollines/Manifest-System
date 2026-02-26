
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAttendance() {
    const serviceId = '52a9bb33-abce-4fdb-8c72-a02b30babf93'; // P569
    console.log(`--- CHECKING ATTENDANCE FOR ${serviceId} (P569) ---`);

    const { count, error } = await supabase
        .from('vehicle_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log(`Count in vehicle_attendance: ${count}`);
    }

    const { count: arrayCount } = await supabase
        .from('personal_vehicles')
        .select('*', { count: 'exact', head: true })
        .contains('attended_service_ids', [serviceId]);

    console.log(`Count in personal_vehicles.attended_service_ids: ${arrayCount}`);

    // Try calling the CORRECT RPC name
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_event_highlights', { event_uuid: serviceId });
    if (rpcErr) {
        console.error("get_event_highlights RPC Error:", rpcErr.message);
    } else {
        console.log("RPC Data:", rpcData);
    }
}

checkAttendance();
