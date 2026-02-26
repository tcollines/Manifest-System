import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// Login as our test Coordinator who belongs to a specific manifest_id
// User: "tinashe_d" belongs to manifest_id: "CTL/EBB01C" (as verified in phase 3)
const testEmail = 'tinashe_d@manifest.local';
const testPassword = 'd';

const testIsolation = async () => {
    console.log(`\n=== Starting Phase 5.7: Tenant Isolation Test ===\n`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        console.log(`1. Logging in as ${testEmail}...`);
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (authError || !authData.session) {
            console.error('❌ Failed to log in via Auth Error:', authError?.message);
            return;
        }

        const manifestId = authData.user.app_metadata.manifest_id;
        console.log(`✅ Logged in successfully. Current JWT manifest_id: '${manifestId}'`);

        // Test 1: Authorized Read (Data in own manifest)
        console.log(`\n2. Testing Authorized Read (manifest_id = '${manifestId}')...`);
        const { data: ownVehicles, error: ownReadError } = await supabase
            .from('vehicles')
            .select('id, number_plate, manifest_id')
            .eq('manifest_id', manifestId)
            .limit(1);

        if (ownReadError) {
            console.error('❌ Authorized Read Failed:', ownReadError.message);
        } else {
            console.log(`✅ Authorized Read Successful. Found:`, ownVehicles?.length, `records.`);
        }

        // Test 2: Unauthorized Read (Data in different manifest)
        const FOREIGN_MANIFEST_ID = 'CTL/EBB01R'; // Example foreign manifest
        console.log(`\n3. Testing Unauthorized Read (target manifest_id = '${FOREIGN_MANIFEST_ID}')...`);
        const { data: foreignVehicles, error: foreignReadError } = await supabase
            .from('vehicles')
            .select('id, number_plate, manifest_id')
            .eq('manifest_id', FOREIGN_MANIFEST_ID);

        if (foreignReadError) {
            console.log(`✅ Unauthorized Read correctly blocked by DB. Error:`, foreignReadError.message);
        } else if (foreignVehicles && foreignVehicles.length === 0) {
            console.log(`✅ Unauthorized Read returned 0 rows (RLS filtered successfully without throwing).`);
        } else {
            console.error(`❌ CRITICAL FAILURE: Security Breach! Foreign data returned.`, foreignVehicles);
        }

        // Test 3: Unauthorized Insert (Spoofing a different manifest_id)
        console.log(`\n4. Testing Unauthorized Insert (Spoofing target manifest_id = '${FOREIGN_MANIFEST_ID}')...`);
        const { data: insertData, error: insertError } = await supabase
            .from('vehicles')
            .insert([{
                manifest_id: FOREIGN_MANIFEST_ID,
                number_plate: 'UAA 999Z',
                type: 'Car',
                capacity: 4
            }])
            .select();

        if (insertError) {
            console.log(`✅ Unauthorized Insert correctly blocked by RLS. Security is active.`);
            console.log(`Reason:`, insertError.message);
        } else {
            console.error(`❌ CRITICAL FAILURE: Security Breach! Insert allowed for a foreign manifest_id.`, insertData);
        }

        console.log(`\n=== Isolation Test Complete ===\n`);

    } catch (e) {
        console.error("Critical Test Exception:", e);
    }
};

testIsolation();
