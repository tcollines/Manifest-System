
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
    const filePath = path.join(__dirname, '../database/61_add_passenger_station_id.sql');
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log("Executing SQL:\n", sql);

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }); // Assuming exec_sql RPC exists

    if (error) {
        // Fallback: Try direct query via restricted access? No, RPC is the way usually.
        // If exec_sql RPC doesn't exist, we might need pg driver.
        console.error("RPC Error:", error);

        // Let's try to use pg client if rpc fails
        try {
            const { Client } = require('pg');
            const client = new Client({
                connectionString: process.env.DATABASE_URL,
            });
            await client.connect();
            await client.query(sql);
            await client.end();
            console.log("Migration executed via PG Client!");
        } catch (pgError) {
            console.error("PG Client Error:", pgError);
        }
    } else {
        console.log("Migration executed via RPC!");
    }
}

runMigration();
