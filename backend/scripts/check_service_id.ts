
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking service_attendance.service_id...');
    const { data, error } = await supabase.from('service_attendance').select('service_id');

    if (error) {
        console.error('Error fetching data:', error.message);
        return;
    }

    const invalid = data.filter(row => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.service_id));

    if (invalid.length > 0) {
        console.log(`Found ${invalid.length} invalid UUIDs in service_attendance.service_id`);
        console.log('First 5:', invalid.slice(0, 5));
    } else {
        console.log('✅ service_attendance.service_id is 100% UUID data.');
    }
}

checkData();
