
import { supabase } from '../src/supabase';
import http from 'http';
import * as fs from 'fs';

// Helper to make an HTTP POST request
function postSoul(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/souls',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

async function verify() {
    console.log("Starting Verification...");

    // 1. Get a valid event, station, vehicle
    const { data: event, error } = await supabase
        .from('ministry_events')
        .select('id, legacy_id')
        .not('legacy_id', 'is', null)
        .limit(1)
        .single();

    const { data: station } = await supabase
        .from('pickup_stations')
        .select('id')
        .limit(1)
        .single();

    const { data: vehicle } = await supabase
        .from('transportation_vehicles')
        .select('id')
        .limit(1)
        .single();

    console.log("Found Station:", station);
    console.log("Found Vehicle:", vehicle);

    if (error || !event) {
        console.error("Failed to get test event:", error);
        return;
    }

    console.log("Using Test Event:", event);

    // 2. Test 1: POST with Legacy ID
    const legacyPayload = {
        first_name: "TestLegacy",
        last_name: "AutoCheck",
        phone: "0700000001",
        event_id: event.legacy_id, // OLD ID
        // Required fields
        source_type: 'Event',
        source_id: event.legacy_id,
        captured_by: '00000000-0000-0000-0000-000000000000',
        status: "New",
        gender: "Male",
        residence: "TestLab"
    };

    console.log("\n--- Test 1: Legacy ID Payload ---");
    try {
        const res1 = await postSoul(legacyPayload);
        console.log("Status:", res1.status);
        if (res1.status === 201) {
            console.log("✅ Legacy ID Accepted");
        } else {
            console.log("❌ Legacy ID Failed");
            console.log("Error Body:", JSON.stringify(res1.body, null, 2));
        }
    } catch (e) {
        console.error("Request Failed:", e);
    }

    // 3. Test 2: POST with UUID
    const uuidPayload = {
        first_name: "TestUUID",
        last_name: "AutoCheck",
        phone: "0700000002",
        event_id: event.id, // NEW ID
        station_id: station?.id,
        vehicle_id: vehicle?.id,
        // Required fields
        source_type: 'Event',
        source_id: event.id,
        captured_by: 'Abraham',
        status: "New",
        gender: "Male",
        residence: "TestLab"
    };

    console.log("\n--- Test 2: UUID Payload ---");
    try {
        const res2 = await postSoul(uuidPayload);
        console.log("Status:", res2.status);
        if (res2.status !== 201) {
            console.log("❌ UUID Failed");
            fs.writeFileSync('d:\\Manifest System\\backend\\verification_error.json', JSON.stringify(res2.body, null, 2));
            console.log("Error written to verification_error.json");
        } else {
            console.log("✅ UUID Accepted");
        }
    } catch (e) {
        console.error("Request Failed:", e);
    }
}

verify();
