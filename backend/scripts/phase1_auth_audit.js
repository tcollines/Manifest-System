require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
    console.log("Starting Phase 1 Audit (Pure JS): public.users...");

    const { data: users, error } = await supabase.from('users').select('*');

    if (error) {
        console.error("Error fetching users:", error);
        process.exit(1);
    }

    const totalUsers = users.length;
    let missingManifestId = 0;
    let invalidUuids = 0;
    let missingPassword = 0;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    users.forEach(user => {
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

        // Check if password exists (using 'password' column as per userController.ts currently comparing exact passwords)
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
}

runAudit();
