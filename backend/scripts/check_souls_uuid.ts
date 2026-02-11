
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking souls.event_id and souls.station_id...');
    // We fetch in chunks if too many? Let's try general fetch first.
    const { data, error } = await supabase.from('souls').select('event_id, station_id');

    if (error) {
        console.error('Error fetching data:', error.message);
        return;
    }

    const invalidEvent = data.filter(row => row.event_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.event_id));
    const invalidStation = data.filter(row => row.station_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.station_id));

    if (invalidEvent.length > 0) {
        console.log(`Found ${invalidEvent.length} invalid UUIDs in souls.event_id`);
    } else {
        console.log('✅ souls.event_id is 100% UUID data (or NULL).');
    }

    if (invalidStation.length > 0) {
        console.log(`Found ${invalidStation.length} invalid UUIDs in souls.station_id`);
    } else {
        console.log('✅ souls.station_id is 100% UUID data (or NULL).');
    }
}

checkData();
