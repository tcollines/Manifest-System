
import { supabase } from './src/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkStationsSchema() {
    console.log("Checking 'pickup_stations' columns...");
    const { data: sData, error: sError } = await supabase
        .from('pickup_stations')
        .select('*')
        .limit(1);

    if (sError) console.error("Error fetching stations:", sError);
    else if (sData && sData.length > 0) {
        console.log("Stations keys:", Object.keys(sData[0]));
    } else {
        console.log("No stations found, attempting to get columns via empty insert/error check or just relying on error msg if I select specific cols.");
        // Try selecting specific columns to see if they exist
        const { error: colError } = await supabase
            .from('pickup_stations')
            .select('coordinator_contact, data_entrant_contact')
            .limit(1);

        if (colError) console.log("Specific columns check error (likely missing):", colError.message);
        else console.log("Specific columns 'coordinator_contact', 'data_entrant_contact' EXIST.");
    }
}

checkStationsSchema();
