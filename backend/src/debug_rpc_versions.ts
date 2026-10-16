import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const debugFunctions = async () => {
    console.log("--- COMPREHENSIVE RPC BEHAVIOR TEST ---");

    const timestamp = Date.now();
    const name = `RpcDeepTest_${timestamp}`;
    const phone = `25677${timestamp}`;
    const locA = "Kampala";
    const locB = "Entebbe";

    // 1. Insert Member A (Initial)
    const { data: a, error: e1 } = await supabase.rpc('submit_member_entry', {
        _id: `test-a-${timestamp}`, _name: name, _category: 'Member', _phone: phone, _status: 'Active',
        _check_in_time: new Date().toISOString(), _gender: 'Male', _residency: locA,
        _born_again: false, _joined_date: new Date().toISOString(), _attended_service_ids: []
    });
    if (e1) return console.error("Error creating A:", e1);
    console.log(`1. Created A (Loc A): ${a.id}`);

    // 2. Insert Member A2 (Same Name, Phone, Loc A) -> SHOULD DUPLICATE (Reuse ID)
    const { data: a2, error: e2 } = await supabase.rpc('submit_member_entry', {
        _id: `test-a2-${timestamp}`, _name: name, _category: 'Member', _phone: phone, _status: 'Active',
        _check_in_time: new Date().toISOString(), _gender: 'Male', _residency: locA,
        _born_again: false, _joined_date: new Date().toISOString(), _attended_service_ids: []
    });
    if (e2) return console.error("Error creating A2:", e2);
    console.log(`2. Created A2 (Loc A): ${a2.id}`);

    if (a.id === a2.id) {
        console.log("✅ PASS: Same Location reuses ID (Duplicate prevented).");
    } else {
        console.log("❌ FAIL: Same Location created NEW ID!");
        console.log("   -> The DB is NOT matching on (Name + Phone + Location).");
    }

    // 3. Insert Member B (Same Name, Phone, DIFFERENT Loc B) -> SHOULD BE NEW
    const { data: b, error: e3 } = await supabase.rpc('submit_member_entry', {
        _id: `test-b-${timestamp}`, _name: name, _category: 'Member', _phone: phone, _status: 'Active',
        _check_in_time: new Date().toISOString(), _gender: 'Male', _residency: locB,
        _born_again: false, _joined_date: new Date().toISOString(), _attended_service_ids: []
    });
    if (e3) return console.error("Error creating B:", e3);
    console.log(`3. Created B (Loc B): ${b.id}`);

    if (a.id !== b.id) {
        console.log("✅ PASS: Different Location creates NEW ID.");
    } else {
        console.log("❌ FAIL: Different Location reused ID!");
        console.log("   -> The DB is running OLD logic (Ignoring Location).");
    }
    console.log("--- TEST END ---");
};

debugFunctions();
