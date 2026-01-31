
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const testDuplicateLogic = async () => {
    const timestamp = Date.now();
    const baseName = `TestUser_${timestamp}`;
    const basePhone = `25677${timestamp.toString().slice(-7)}`;
    const locA = 'Kampala';

    console.log(`--- DEBUG START: ${baseName} | ${basePhone} ---`);

    // 1. Create Member A (First Time)
    console.log("1. Creating Member A...");
    const { data: memberA, error: errA } = await supabase.rpc('submit_member_entry', {
        _id: `m-A-${timestamp}`, _name: baseName, _category: 'Member', _phone: basePhone,
        _status: 'Active', _check_in_time: new Date().toISOString(), _gender: 'Male',
        _residency: locA, _born_again: false, _joined_date: new Date().toISOString(), _attended_service_ids: []
    });

    if (errA) console.error("ERROR A:", errA);
    else console.log("SUCCESS A:", memberA.id, memberA.category);

    // 2. Create Member A Again (Exact Duplicate)
    console.log("2. Creating Member A Again (Exact Duplicate)...");
    const { data: memberA2, error: errA2 } = await supabase.rpc('submit_member_entry', {
        _id: `m-A2-${timestamp}`, _name: baseName, _category: 'Member', _phone: basePhone,
        _status: 'Active', _check_in_time: new Date().toISOString(), _gender: 'Male',
        _residency: locA, _born_again: false, _joined_date: new Date().toISOString(), _attended_service_ids: []
    });

    if (errA2) console.error("ERROR A2:", errA2);
    else {
        console.log("SUCCESS A2:", memberA2.id, memberA2.category);
        if (memberA?.id === memberA2?.id) console.log(">>> PASS: IDs MATCH (Duplicate Detected)");
        else console.log(">>> FAIL: IDs DO NOT MATCH (Duplicate Created)");
    }

    // 3. Create Member A Again (Whitespace Duplicate)
    console.log("3. Creating Member A Again (Whitespace Duplicate)...");
    const { data: memberA3, error: errA3 } = await supabase.rpc('submit_member_entry', {
        _id: `m-A3-${timestamp}`, _name: ` ${baseName} `, _category: 'Member', _phone: basePhone,
        _status: 'Active', _check_in_time: new Date().toISOString(), _gender: 'Male',
        _residency: `  ${locA}  `, _born_again: false, _joined_date: new Date().toISOString(), _attended_service_ids: []
    });

    if (errA3) console.error("ERROR A3:", errA3);
    else {
        console.log("SUCCESS A3:", memberA3.id, memberA3.category);
        if (memberA?.id === memberA3?.id) console.log(">>> PASS: IDs MATCH (Whitespace Duplicate Detected)");
        else console.log(">>> FAIL: IDs DO NOT MATCH (Whitespace Duplicate Created)");
    }

    console.log("--- DEBUG END ---");
};

testDuplicateLogic();
