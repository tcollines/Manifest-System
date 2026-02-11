
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking incidents.service_id...');
    const { data: incidents, error: err1 } = await supabase.from('incidents').select('service_id');
    if (err1) {
        console.error('Error fetching incidents:', err1.message);
    } else {
        const invalid = incidents.filter(row => row.service_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.service_id));
        if (invalid.length > 0) {
            console.log(`Found ${invalid.length} invalid UUIDs in incidents.service_id`);
            console.log('First 5:', invalid.slice(0, 5));
        } else {
            console.log('✅ incidents.service_id is 100% UUID data (or NULL).');
        }
    }

    console.log('Checking training_requests.requester_id...');
    const { data: requests, error: err2 } = await supabase.from('training_requests').select('requester_id');
    if (err2) {
        console.error('Error fetching training_requests:', err2.message);
    } else {
        const invalid = requests.filter(row => row.requester_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.requester_id));
        if (invalid.length > 0) {
            console.log(`Found ${invalid.length} invalid UUIDs in training_requests.requester_id`);
            console.log('First 5:', invalid.slice(0, 5));
        } else {
            console.log('✅ training_requests.requester_id is 100% UUID data.');
        }
    }
}

checkData();
