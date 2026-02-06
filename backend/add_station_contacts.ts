
import { supabase } from './src/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

async function addStationColumns() {
    console.log("Adding contact columns to 'pickup_stations' table...");

    // Similar to previous script, we'll try RPC or print SQL instructions.
    // Based on previous success (or failure handled by user manual run), we provide the SQL.

    const sql = `
    ALTER TABLE pickup_stations ADD COLUMN IF NOT EXISTS coordinator_contact text;
    ALTER TABLE pickup_stations ADD COLUMN IF NOT EXISTS data_entrant_contact text;
    `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error("Rpc 'exec_sql' failed:", error.message);
            console.log("\nPlease run this SQL in your Supabase SQL Editor:");
            console.log(sql);
        } else {
            console.log("Successfully added columns via RPC!");
        }
    } catch (e) {
        console.log("Error attempting RPC:", e);
    }
}

addStationColumns();
