
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Force load .env from the backend directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
// If that fails, try looking in root
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const verifyStrictLogic = async () => {
    console.log("--- VERIFYING STRICT FIRST TIMER LOGIC ---");
    const timestamp = Date.now();

    // Test Data
    const serviceId1 = `evt-test-1-${timestamp}`;
    const serviceId2 = `evt-test-2-${timestamp}`;

    console.log("1. Creating NEW Member (Category: Member) -> Should NOT be First Timer");
    const name1 = `TestMember_${timestamp}`;
    const { data: member1, error: err1 } = await supabase.rpc('submit_member_entry', {
        _id: null, // REQUIRED: Explicit null for new member
        _name: name1,
        _category: 'Member',
        _phone: `25677${timestamp}`,
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Female',
        _residency: 'Test',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: [serviceId1],
        _current_service_id: serviceId1
    });

    if (err1) console.error("❌ Error 1:", err1);
    else {
        if (member1.is_first_timer === false) console.log("✅ Member1 correctly set is_first_timer = false");
        else console.error("❌ Member1 Incorrectly set is_first_timer = true");
    }

    console.log("\n2. Creating NEW First Timer (Category: First Timer) -> Should be First Timer");
    const name2 = `TestFT_${timestamp}`;
    const { data: ft1, error: err2 } = await supabase.rpc('submit_member_entry', {
        _id: null, // REQUIRED
        _name: name2,
        _category: 'First Timer',
        _phone: `25678${timestamp}`,
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _residency: 'Test',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: [serviceId1],
        _current_service_id: serviceId1
    });

    if (err2) console.error("❌ Error 2:", err2);
    else {
        if (ft1.is_first_timer === true && ft1.first_timer_service_id === serviceId1 && ft1.first_timer_date) {
            console.log("✅ First Timer correctly set is_first_timer=true, date, and service ID");
        } else {
            console.error("❌ First Timer fields invalid:", ft1);
        }
    }

    console.log("\n3. Re-Registering First Timer (As Member) for SAME Service -> Should stay First Timer (Immutable fields)");

    const { data: ftUpdated, error: err3 } = await supabase.rpc('submit_member_entry', {
        _id: null, // New entry intent, but deduplication will find existing by name/phone
        _name: name2, // Same Name
        _phone: `25678${timestamp}`, // Same Phone
        _category: 'Member', // Returning as Member
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _residency: 'Test',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: [serviceId2], // New Service
        _current_service_id: serviceId2
    });

    if (err3) console.error("❌ Error 3:", err3);
    else {
        console.log("DEBUG FULL REPONSE:", JSON.stringify(ftUpdated, null, 2));

        let valid = true;
        if (ftUpdated && ftUpdated.category !== 'Member') { console.error("❌ Category not updated to Member"); valid = false; }
        if (ftUpdated && ftUpdated.is_first_timer !== true) { console.error("❌ is_first_timer lost!"); valid = false; }
        if (ftUpdated && ftUpdated.first_timer_service_id !== serviceId1) {
            console.error(`❌ first_timer_service_id changed! Expected ${serviceId1}, Got ${ftUpdated?.first_timer_service_id}`);
            valid = false;
        }

        if (valid) console.log("✅ Returning First Timer handled correctly: Category updated, First Timer history Preserved.");
    }
};

verifyStrictLogic();
