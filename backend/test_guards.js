const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function runTests() {
    await client.connect();
    console.log("Connected to DB.");

    try {
        console.log("\n--- TEST 1: Optimistic Locking ---");
        // Get any vehicle
        const { rows: vehicles } = await client.query(`SELECT id, version FROM vehicles LIMIT 1`);
        if (vehicles.length === 0) {
            console.log("No vehicles found to test.");
            return;
        }
        const v = vehicles[0];
        console.log(`Testing vehicle ${v.id}, current version: ${v.version}`);

        // Try updating WITH correct version
        try {
            await client.query(`
                UPDATE vehicles 
                SET capacity = capacity
                WHERE id = $1 AND version = $2
            `, [v.id, v.version]);
            console.log("Initial increment passed.");
        } catch (updateErr) {
            console.error("Failed to perform initial ID/Version increment update:", updateErr.message);
            return;
        }

        // Fetch new version
        const { rows: updated } = await client.query(`SELECT version FROM vehicles WHERE id = $1`, [v.id]);
        console.log(`Version successfully incremented to: ${updated[0].version}`);

        // Try updating WITH stale version (should fail to update any rows)
        const { rowCount } = await client.query(`
            UPDATE vehicles 
            SET capacity = capacity
            WHERE id = $1 AND version = $2
        `, [v.id, v.version]); // using OLD version

        if (rowCount === 0) {
            console.log("✅ Optimistic Lock SUCCESS: Stale update rejected (0 rows affected).");
        } else {
            console.error("❌ Optimistic Lock FAILED: Stale update succeeded!");
        }

        console.log("\n--- TEST 2: State Machine Guards ---");

        // Find a vehicle in Onboarding
        const { rows: onboard_vehicles } = await client.query(`
            SELECT id, current_stage FROM vehicles 
            WHERE current_stage = 'Onboarding' LIMIT 1
        `);

        if (onboard_vehicles.length > 0) {
            const ov = onboard_vehicles[0];
            console.log(`Testing state bounds on vehicle ${ov.id}`);

            // Illegal forward jump (Onboarding 1 -> FinanceApproval 4)
            let jumpBlocked = false;
            try {
                await client.query(`
                    UPDATE vehicles 
                    SET current_stage = 'FinanceApproval' 
                    WHERE id = $1
                `, [ov.id]);
            } catch (err) {
                if (err.message.includes('State Jump Error')) {
                    jumpBlocked = true;
                    console.log("✅ State Jump Blocked SUCCESS:", err.message);
                }
            }
            if (!jumpBlocked) console.error("❌ State Jump FAILED: Illegal forward jump permitted!");
        } else {
            console.log("Skipping test: No 'Onboarding' vehicles found.");
        }

    } catch (e) {
        console.error("Test execution failed:", e);
    } finally {
        await client.end();
        console.log("\nTests complete.");
    }
}

runTests();
