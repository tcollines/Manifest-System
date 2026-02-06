
import { supabase } from './src/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

async function addEntrantName() {
    console.log("Adding 'data_entrant_name' column to 'pickup_stations'...");

    // Check if column exists or add it
    const sql = `ALTER TABLE pickup_stations ADD COLUMN IF NOT EXISTS data_entrant_name text;`;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.log("RPC failed. Please run manually:");
            console.log(sql);
        } else {
            console.log("Success (RPC).");
        }
    } catch (e) {
        console.log("RPC error", e);
    }
}

addEntrantName();
