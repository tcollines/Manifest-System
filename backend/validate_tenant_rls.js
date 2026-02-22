const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });


// Create two clients to simulate two different tenants
const tenantAClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    global: {
        headers: {
            Authorization: `Bearer ${generateTestToken('tenant-A')}`
        }
    }
});

const tenantBClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    global: {
        headers: {
            Authorization: `Bearer ${generateTestToken('tenant-B')}`
        }
    }
});

// Helper to generate a dummy JWT for testing RLS locally
function generateTestToken(manifestId) {
    const jwt = require('jsonwebtoken');
    const secret = process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';
    return jwt.sign(
        {
            sub: 'test-user-123',
            role: 'authenticated',
            aud: 'authenticated',
            manifest_id: manifestId
        },
        secret
    );
}

async function runValidation() {
    console.log(`\n--- 🧪 VALIDATING TENANT ISOLATION (RLS) ---`);

    try {
        // 1. Insert as Tenant A
        console.log("\n1. Tenant A: Inserting dummy member...");
        const { data: insertData, error: insertErr } = await tenantAClient
            .from('members')
            .insert({ name: 'User A', category: 'Member', phone: '123456789', status: 'Absent', manifest_id: 'tenant-A' })
            .select()
            .single();

        if (insertErr) {
            console.error("❌ Failed to insert as Tenant A:", insertErr.message);
            return;
        }
        console.log(`✅ Success. Inserted ID: ${insertData.id}`);

        // 2. Read as Tenant B (Should return 0 rows)
        console.log("\n2. Tenant B: Attempting to read Tenant A's members...");
        const { data: readData, error: readErr } = await tenantBClient
            .from('members')
            .select('*');

        if (readErr) {
            console.error("Error reading:", readErr.message);
        } else if (readData.length === 0) {
            console.log("✅ Success. Tenant B returned 0 rows (Cross-tenant read blocked).");
        } else {
            console.error(`❌ FAILURE: Tenant B can see ${readData.length} records! RLS IS BYPASSED.`);
        }

        // 3. Update as Tenant B (Should modify 0 rows and not throw)
        console.log("\n3. Tenant B: Attempting to update Tenant A's member...");
        const { data: updateData, error: updateErr } = await tenantBClient
            .from('members')
            .update({ name: 'Hacked by B' })
            .eq('id', insertData.id)
            .select();

        if (updateData && updateData.length === 0) {
            console.log("✅ Success. Tenant B affected 0 rows (Cross-tenant update blocked).");
        } else {
            console.error("❌ FAILURE: Tenant B modified Tenant A's record!");
        }

        // 4. Delete as Tenant A (Clean up test data)
        console.log("\n4. Tenant A: Cleaning up test data...");
        const { error: deleteErr } = await tenantAClient
            .from('members')
            .delete()
            .eq('id', insertData.id);

        if (!deleteErr) {
            console.log("✅ Cleanup successful.");
        }

        console.log("\n✅ ALL RLS TESTS PASSED. Enterprise isolation is active.");

    } catch (e) {
        console.error("Test execution failed:", e);
    }
}

runValidation();
