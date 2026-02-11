
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking personal_vehicles.id...');
    const { data, error } = await supabase.from('personal_vehicles').select('id');

    if (error) {
        console.error('Error fetching data:', error.message);
        return;
    }

    const invalidId = data.filter(row => row.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id));

    if (invalidId.length > 0) {
        console.log(`Found ${invalidId.length} invalid UUIDs in personal_vehicles.id`);
        console.log('First 5:', invalidId.slice(0, 5));
    } else {
        console.log('✅ personal_vehicles.id is 100% UUID data.');
    }
}

checkData();
