
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStations() {
    console.log("Checking station event links...");
    const stationIds = [
        '5f435998-c038-4aa8-8224-0e32eb566525',
        'b55ad269-115b-4ed0-896c-1b8c0b18cdf7',
        'abf7aa92-5490-4423-bd35-af68e42a7ba9',
        '27e5815b-1abe-4f64-a579-ce419e7ccb1c'
    ];

    const { data: stations, error } = await supabase
        .from('pickup_stations')
        .select('id, name, event_id')
        .in('id', stationIds);

    if (error) {
        console.error("Error fetching stations:", error);
        return;
    }

    if (!stations || stations.length === 0) {
        console.log("No stations found.");
    } else {
        stations.forEach(s => {
            console.log(`Station: ${s.name} (${s.id}) -> EventID: ${s.event_id}`);
        });
    }
}

checkStations();
