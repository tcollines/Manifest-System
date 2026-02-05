
import { supabase } from './src/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
    console.log("Checking 'vehicles' columns...");
    const { data: vData, error: vError } = await supabase
        .from('vehicles')
        .select('*')
        .limit(1);

    if (vError) console.error("Error fetching vehicles:", vError);
    else if (vData && vData.length > 0) console.log("Vehicles keys:", Object.keys(vData[0]));
    else console.log("No vehicles found to infer schema.");

    console.log("\nChecking 'pickup_stations' columns...");
    const { data: sData, error: sError } = await supabase
        .from('pickup_stations')
        .select('*')
        .limit(1);

    if (sError) console.error("Error fetching stations:", sError);
    else if (sData && sData.length > 0) console.log("Stations keys:", Object.keys(sData[0]));
    else console.log("No stations found to infer schema.");
}

checkSchema();
