
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verifyFlip() {
    console.log("--- VERIFYING PERSONAL VEHICLES AUTHORITY FLIP ---");

    // 1. Check Schema (Indirectly via Data Type)
    // We expect 'id' to be UUID. If we select it and it looks like UUID, good.
    // If we try to filter by a non-UUID string on 'id', it should fail (Postgres Type Error) 
    // OR we just check the format of returned data.

    const { data: vehicles, error: vError } = await supabase
        .from('personal_vehicles')
        .select('id, id_text_legacy_deprecated')
        .limit(10);

    if (vError) {
        console.error("❌ Error fetching personal_vehicles:", vError.message);
        return;
    }

    if (vehicles.length === 0) {
        console.log("⚠️ No vehicles found to verify.");
    } else {
        const sample = vehicles[0];
        const isUuid = /^[0-9a-f-]{36}$/i.test(sample.id);
        console.log(`Sample ID: ${sample.id} (UUID format: ${isUuid})`);
        console.log(`Sample Legacy ID: ${sample.id_text_legacy_deprecated}`);

        if (isUuid) {
            console.log("✅ 'id' column appears to be UUID.");
        } else {
            console.error("❌ 'id' column is NOT UUID!");
        }
    }

    // 2. Check Vehicle Attendance FK
    const { data: attendance, error: aError } = await supabase
        .from('vehicle_attendance')
        .select('vehicle_id') // This should now be the UUID column
        .limit(10);

    if (aError) {
        console.error("❌ Error fetching vehicle_attendance:", aError.message);
        return;
    }

    if (attendance.length > 0) {
        const sampleAtt = attendance[0];
        const isAttUuid = /^[0-9a-f-]{36}$/i.test(sampleAtt.vehicle_id);
        console.log(`Sample Attendance Vehicle ID: ${sampleAtt.vehicle_id} (UUID format: ${isAttUuid})`);

        if (isAttUuid) {
            console.log("✅ 'vehicle_attendance.vehicle_id' appears to be UUID.");
        } else {
            console.error("❌ 'vehicle_attendance.vehicle_id' is NOT UUID!");
        }
    } else {
        console.log("⚠️ No attendance records to verify.");
    }

    // 3. Insert Test
    const newId = crypto.randomUUID();
    const { data: insertData, error: insertError } = await supabase
        .from('personal_vehicles')
        .insert({
            id: newId,
            number_plate: 'TEST-FLIP',
            driver_name: 'Flip Tester',
            driver_contact: '000',
            status: 'Absent',
            legacy_id: 'legacy-test-val'
        })
        .select()
        .single();

    if (insertError) {
        console.error("❌ Insert Test Failed:", insertError.message);
    } else {
        console.log("✅ Insert Test Passed (Native UUID).");
        // Cleanup
        await supabase.from('personal_vehicles').delete().eq('id', newId);
    }
}

verifyFlip();
