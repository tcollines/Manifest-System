import * as dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const RAW_DB_URL = process.env.DATABASE_URL;

async function run() {
    const client = new Client({
        connectionString: RAW_DB_URL,
    });

    try {
        await client.connect();
        console.log('Connected directly to DB bypassing PgBouncer!');
        
        // Disable ALL triggers on vehicles temporarily
        await client.query("ALTER TABLE vehicles DISABLE TRIGGER ALL;");
        console.log("Triggers disabled.");

        // 1. Delete the fake cloned vehicle
        await client.query("DELETE FROM vehicles WHERE number_plate = 'UA 123ED';");
        
        // 2. Rollback the original vehicle
        const res = await client.query(`
            UPDATE vehicles 
            SET current_stage = 'Reg. Verify', 
                status = 'In Progress', 
                journey_direction = 'Return',
                number_plate = 'UA 123ED'
            WHERE number_plate = 'UA 123ED-completed'
            RETURNING *;
        `);

        if (res.rowCount === 0) {
            console.log("Could not find the original vehicle to regress.");
        } else {
            console.log("Original vehicle perfectly regressed to Reg. Verify!");
        }

    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        try {
            await client.query("ALTER TABLE vehicles ENABLE TRIGGER ALL;");
            console.log("Triggers restored.");
            await client.end();
        } catch(e) {}
    }
}

run();
