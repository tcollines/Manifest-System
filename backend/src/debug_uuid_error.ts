
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const debug = async () => {
    console.log("--- START DEBUG: UUID ERROR ---");
    const timestamp = Date.now();
    const name = `UuidTest_${timestamp}`;
    const phone = `25675${timestamp.toString().slice(-7)}`;

    // 1. Create Initial Record
    console.log("1. Creating Initial Record...");
    // Pass valid UUID for service just in case, or empty
    const { data: d1, error: e1 } = await supabase.rpc('submit_member_entry', {
        _id: null,
        _name: name,
        _category: 'Member',
        _phone: phone,
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _residency: 'Kampala',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: []
    });
    if (e1) console.error("E1:", e1);
    else console.log("Success 1:", d1?.id);

    // 2. Submit DUPLICATE with "evt-..." ID to trigger the error
    // User said: "error comes when it is a duplicate"
    console.log("2. Submitting Duplicate with 'evt-...' service ID...");
    const { data: d2, error: e2 } = await supabase.rpc('submit_member_entry', {
        _id: null, // Let's try null first
        _name: name, // Matches existing
        _category: 'Member',
        _phone: phone,
        _residency: 'Kampala',
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: ["evt-1769782548237"] // The ID user reported
    });

    if (e2) {
        console.error("E2 (Expect failure):", e2);
    } else {
        console.log("Success 2:", d2?._meta);
    }

    // 3. Submit DUPLICATE with '_id' as text (if that's what frontend sends)
    console.log("3. Submitting Duplicate with '_id' = 'some-text'...");
    // Note: RPC expects _id to be text, but tries to cast to UUID.
    // If it's "some-text", it should fail invalid syntax, BUT maybe that causes the "text=uuid" later?
    const { data: d3, error: e3 } = await supabase.rpc('submit_member_entry', {
        _id: "some-text-id",
        _name: name,
        _category: 'Member',
        _phone: phone,
        _residency: 'Kampala',
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: []
    });

    if (e3) console.error("E3:", e3);
    else console.log("Success 3:", d3?._meta);
};

debug();
