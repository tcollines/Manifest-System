import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const debugNewMember = async () => {
    console.log("--- DEBUGGING NEW MEMBER REGISTRATION ---");
    const timestamp = Date.now();

    // 1. Setup: Use a Random Valid Service UUID (Simulating a "New Event")
    // We can't easily create a service if we don't know the schema/RPC, 
    // but assuming Foreign Keys aren't strict in the RPC (which just suppresses errors), 
    // OR assuming we use a UUID that *might* exist or we just want to test the INSERT logic.
    // If the DB has FK constraints on service_attendance.service_id, we need a real ID.
    // For now, let's try a known valid one if possible, or a random one and check error.

    // Let's try to fetch a real service first to be safe.
    const { data: services } = await supabase.from('ministry_events').select('id').limit(1);
    const validServiceId = services && services.length > 0 ? services[0].id : '550e8400-e29b-41d4-a716-446655440000';
    console.log("Using Service ID:", validServiceId);

    const newMemberName = `NewUser_${timestamp}`;

    console.log(`1. Submitting NEW Member: ${newMemberName}`);

    const payload = {
        _id: null, // New member
        _name: newMemberName,
        _phone: `25670${timestamp.toString().slice(-7)}`,
        _category: 'Member',
        _status: 'Active',
        _check_in_time: new Date().toISOString(),
        _gender: 'Male',
        _residency: 'DebugCity',
        _born_again: false,
        _joined_date: new Date().toISOString(),
        _attended_service_ids: [validServiceId] // Valid Event ID
    };

    const { data, error } = await supabase.rpc('submit_member_entry', payload);

    if (error) {
        console.error("❌ RPC Error:", error);
        return;
    }

    console.log("✅ RPC Success. Returned Data:", JSON.stringify(data, null, 2));
    const fs = require('fs');
    fs.writeFileSync('debug_output.json', JSON.stringify(data, null, 2));

    // 2. Verify Database State
    if (data && data.id) {
        const { data: attendance, error: aError } = await supabase
            .from('service_attendance')
            .select('*')
            .eq('member_id', data.id)
            .eq('service_id', validServiceId);

        if (aError) {
            console.error("Error checking attendance:", aError);
        } else if (attendance && attendance.length > 0) {
            console.log("✅ Attendance Record FOUND in DB.");
        } else {
            console.error("❌ Attendance Record NOT FOUND in DB.");
            console.log("Possible mismatch in Service ID or Insert logic failure.");
        }
    }
};

debugNewMember();
