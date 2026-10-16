import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const verifyRobustness = async () => {
    console.log("--- STARTING ROBUSTNESS VERIFICATION ---");
    const timestamp = Date.now();
    const baseName = `RobustUser_${timestamp}`;
    const validUuid = '550e8400-e29b-41d4-a716-446655440000'; // Example valid UUID for testing syntax (might fail FK if not exists, but that's DB constraint)
    // Actually, if we use a random UUID that doesn't exist in services, it might fail FK constraint if one exists.
    // The previous code didn't check FK in the RPC, it just inserted.
    // If service_attendance has FK to services, we might need a real service ID.
    // BUT the user's error was "invalid input syntax for type uuid", which happens BEFORE FK check.
    // So if we pass a valid UUID syntax, we pass the syntax check. 
    // WE WILL USE A RANDOM VALID UUID. If it fails FK, that confirms UUID syntax passed.

    const invalidId = "evt-12345-temp";

    console.log(`Submitting user '${baseName}' with IDs: [ '${validUuid}', '${invalidId}' ]`);

    const payload = {
        _id: null,
        _name: baseName,
        _phone: `25679${timestamp.toString().slice(-7)}`,
        _category: 'Member',
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _residency: 'RobustCity',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: [validUuid, invalidId]
    };

    const { data, error } = await supabase.rpc('submit_member_entry', payload);

    if (error) {
        console.error("❌ FAILURE: RPC Error:", error);
        // If FK violation, that's actually partial success (it tried to insert logic)
        // But we want to verify metadata return.
    } else {
        console.log("✅ RPC Success!");
        console.log("Returned ID:", data.id);

        const meta = data._meta;

        const fs = require('fs');
        fs.writeFileSync('robustness_result.json', JSON.stringify(data, null, 2));
        console.log("Result written to robustness_result.json");

        // Assertions
        const ignored = meta?.ignored_service_ids || [];
        if (ignored.includes(invalidId)) {
            console.log("✅ PASS: Invalid ID was correctly identified and returned in 'ignored_service_ids'.");
        } else {
            console.error("❌ FAIL: Invalid ID was NOT found in 'ignored_service_ids'.");
        }

        if (ignored.includes(validUuid)) {
            console.error("❌ FAIL: Valid UUID was incorrectly ignored.");
        } else {
            console.log("✅ PASS: Valid UUID was NOT ignored (attempted insert).");
        }
    }
    console.log("--- END ---");
};

verifyRobustness();
