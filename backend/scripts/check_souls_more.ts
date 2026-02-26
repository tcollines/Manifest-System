
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking souls.id and souls.vehicle_id...');
    const { data, error } = await supabase.from('souls').select('id, vehicle_id');

    if (error) {
        console.error('Error fetching data:', error.message);
        return;
    }

    const invalidId = data.filter(row => row.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id));
    const invalidVehicle = data.filter(row => row.vehicle_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.vehicle_id));

    if (invalidId.length > 0) {
        console.log(`Found ${invalidId.length} invalid UUIDs in souls.id`);
        console.log('First 5:', invalidId.slice(0, 5));
    } else {
        console.log('✅ souls.id is 100% UUID data.');
    }

    if (invalidVehicle.length > 0) {
        console.log(`Found ${invalidVehicle.length} invalid UUIDs in souls.vehicle_id`);
        console.log('First 5:', invalidVehicle.slice(0, 5));
    } else {
        console.log('✅ souls.vehicle_id is 100% UUID data (or NULL).');
    }
}

checkData();
