import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("Missing DATABASE_URL in .env");
    process.exit(1);
}

async function runAudit() {
    console.log("Starting Phase 1 Audit (Native PG connection): public.users...");

    const client = new Client({ connectionString: dbUrl });

    try {
        await client.connect();

        // Disable RLS temporarily just for the audit if needed, but since we connect as superuser/postgres via connection string, we should bypass it automatically.
        const res = await client.query('SELECT * FROM public.users');
        const users = res.rows;

        const totalUsers = users.length;
        let missingManifestId = 0;
        let invalidUuids = 0;
        let missingPassword = 0;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        users.forEach((user: any) => {
            // Check if ID is UUID
            if (!uuidRegex.test(user.id)) {
                console.error(`Invalid UUID found for user: ${user.username} (ID: ${user.id})`);
                invalidUuids++;
            }

            // Check manifest_id not null
            if (!user.manifest_id) {
                console.error(`Missing manifest_id for user: ${user.username} (ID: ${user.id})`);
                missingManifestId++;
            }

            // Check if password exists
            if (!user.password || user.password.trim() === '') {
                console.warn(`Missing password for user: ${user.username} (ID: ${user.id})`);
                missingPassword++;
            }
        });

        console.log("\n--- Audit Results ---");
        console.log(`Total users: ${totalUsers}`);
        console.log(`Users missing manifest_id: ${missingManifestId}`);
        console.log(`Users with invalid UUID IDs: ${invalidUuids}`);
        console.log(`Users with missing password: ${missingPassword}`);

        if (missingManifestId > 0 || invalidUuids > 0) {
            console.error("\n❌ AUDIT FAILED: Violations found. Aborting migration setup.");
            process.exit(1);
        }

        console.log("\n✅ AUDIT PASSED: Ready for Supabase Auth sync.");
        process.exit(0);

    } catch (error) {
        console.error("Error running audit:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runAudit();
