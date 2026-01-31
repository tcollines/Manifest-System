
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function testBatchFetch() {
    console.log("🚀 Testing /members/batch Endpoint...");

    // Test 1: Valid IDs
    // (Ideally pick IDs that exist, but random UUIDs should just return empty array or correct lookup)
    const validPayload = { ids: ['00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111'] };

    try {
        console.log("\n1. Testing Valid UUIDs:");
        const res1 = await fetch(`${BASE_URL}/members/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validPayload)
        });
        console.log(`Status: ${res1.status}`);
        const data1 = await res1.json();
        console.log("Response:", JSON.stringify(data1).substring(0, 100) + "...");
    } catch (e) {
        console.error("Test 1 Failed:", e);
    }

    // Test 2: Invalid UUIDs (which might cause DB error)
    const invalidPayload = { ids: ['invalid-uuid', 'another-one'] };
    try {
        console.log("\n2. Testing Invalid UUIDs:");
        const res2 = await fetch(`${BASE_URL}/members/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidPayload)
        });
        console.log(`Status: ${res2.status}`);
        const data2 = await res2.json(); // If 500, this might be the error object
        console.log("Response:", JSON.stringify(data2));
    } catch (e) {
        console.error("Test 2 Failed:", e);
    }

    // Test 3: Empty Array
    try {
        console.log("\n3. Testing Empty Array:");
        const res3 = await fetch(`${BASE_URL}/members/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [] })
        });
        console.log(`Status: ${res3.status}`);
        console.log("Response:", await res3.json());
    } catch (e) {
        console.error("Test 3 Failed:", e);
    }
}

testBatchFetch();
