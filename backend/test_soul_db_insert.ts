import { supabase } from './src/supabase';

async function testInsert() {
    const payload = {
        manifest_id: "mf_phaneroo",
        first_name: "Test",
        last_name: "Return",
        phone: "0770000000",
        gender: "Male",
        residence: "Kampala",
        status: "New",
        source_type: "Event",
        source_id: "12345678-1234-1234-1234-123456789013",
        captured_by: "00000000-0000-0000-0000-000000000000",
        event_id: "12345678-1234-1234-1234-123456789013",
        vehicle_id: "12345678-1234-1234-1234-123456789014",
    };

    console.log("Upserting soul...");
    const { data, error } = await supabase.from('souls').upsert(payload, { onConflict: 'id' }).select();

    if (error) {
        console.error("Error inserting:", error);
    } else {
        console.log("Success:", data);

        // clean up
        if (data && data[0] && data[0].id) {
            await supabase.from('souls').delete().eq('id', data[0].id);
        }
    }
}

testInsert();
