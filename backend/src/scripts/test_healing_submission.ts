
import fetch from 'node-fetch';

async function testSubmission() {
    const payload = {
        date: new Date().toISOString().split('T')[0],
        hospital_name: "Test Hospital",
        labourers_count: 5,
        souls_count: 1,
        people_reached: 10,
        notes: "Test submission via script",
        captured_by: "test-user-id", // Ensure this user exists or is not checked strictly if FK
        testimonies: [],
        souls: [
            {
                firstName: "Test",
                lastName: "Soul",
                phone: "1234567890",
                gender: "Male",
                residence: "Kampala",
                nextOfKinName: "Test Kin",
                nextOfKinContact: "0987654321"
            }
        ]
    };

    try {
        const response = await fetch('http://localhost:5000/api/healing/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json() as any;
        console.log('Status:', response.status);
        console.log('Report Created:', data.id);

        if (data.id) {
            // Verify the souls creation
            const soulsResponse = await fetch(`http://localhost:5000/api/souls?sourceId=${data.id}`);
            const souls = await soulsResponse.json();
            console.log('Created Souls:', JSON.stringify(souls, null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testSubmission();
