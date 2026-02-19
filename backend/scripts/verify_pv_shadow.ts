
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verify() {
    console.log("--- VERIFYING PERSONAL VEHICLES SHADOW MIGRATION ---");

    // 1. Check Personal Vehicles Shadow Columns
    const { data: vehicles, error: vError } = await supabase
        .from('personal_vehicles')
        .select('id, id_uuid, legacy_id');

    if (vError) {
        console.error("❌ Error fetching personal_vehicles:", vError.message);
        return;
    }

    const total = vehicles.length;
    const uuidPopulated = vehicles.filter(v => v.id_uuid).length;
    const legacyPopulated = vehicles.filter(v => v.legacy_id).length;
    const validUuidFormat = vehicles.filter(v => /^[0-9a-f-]{36}$/i.test(v.id_uuid)).length;

    console.log(`\nPersonal Vehicles Total: ${total}`);
    console.log(`- id_uuid populated: ${uuidPopulated}/${total}`);
    console.log(`- legacy_id populated: ${legacyPopulated}/${total}`);
    console.log(`- Valid UUID format: ${validUuidFormat}/${total}`);

    if (uuidPopulated === total && validUuidFormat === total) {
        console.log("✅ Personal Vehicles Shadow Columns Backfilled Successfully.");
    } else {
        console.error("❌ Personal Vehicles Shadow Columns Incomplete!");
    }

    // 2. Check Vehicle Attendance Shadow Columns
    const { data: attendance, error: aError } = await supabase
        .from('vehicle_attendance')
        .select('id, vehicle_id, vehicle_id_uuid');

    if (aError) {
        console.error("❌ Error fetching vehicle_attendance:", aError.message);
        return;
    }

    const attTotal = attendance.length;
    const attUuidPopulated = attendance.filter(a => a.vehicle_id_uuid).length;

    // Check if FK works (by checking if we can join)
    // We can simulate this by ensuring vehicle_id_uuid exists in personal_vehicles map
    const pvUuidSet = new Set(vehicles.map(v => v.id_uuid));
    const orphans = attendance.filter(a => a.vehicle_id_uuid && !pvUuidSet.has(a.vehicle_id_uuid));

    console.log(`\nVehicle Attendance Total: ${attTotal}`);
    console.log(`- vehicle_id_uuid populated: ${attUuidPopulated}/${attTotal}`);
    console.log(`- Orphans (UUID not in PV): ${orphans.length}`);

    if (attTotal > 0 && attUuidPopulated === 0) {
        console.warn("⚠️  Vehicle Attendance has 0 UUIDs populated. Was the backfill successful?");
    } else if (orphans.length === 0) {
        console.log("✅ Vehicle Attendance FK Integrity Verified.");
    } else {
        console.error(`❌ Found ${orphans.length} Orphans in Vehicle Attendance!`);
    }

}

verify();
