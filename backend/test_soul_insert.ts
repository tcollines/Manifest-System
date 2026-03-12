import fetch from 'node-fetch';

async function testPost() {
    const payload = {
        id: "22345678-1234-1234-1234-123456789012",
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

    console.log("Sending payload:", payload);

    try {
        const response = await fetch('http://localhost:5000/api/souls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // We need to bypass authenticate middleware or provide a token. Wait, I can test the DB directly.
            },
            body: JSON.stringify(payload)
        });
        const text = await response.text();
        console.log("Response:", response.status, text);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testPost();
