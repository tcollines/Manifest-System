const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'http://localhost:5000/api';

async function testEntrantCreation() {
    try {
        console.log("== Testing Logsitic/Data Entrant Creation with Collisions ==");

        // 1. Authenticate as Admin
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'aine',
            password: 'password123'
        });
        const adminToken = adminRes.data.session.access_token;
        console.log("=> Admin logged in.");

        // 2. Exact Payload from RegistrationDashboard.tsx
        const stationId = uuidv4();
        const reuseUsername = "eria_test_" + Date.now();

        const payload1 = {
            id: uuidv4(),
            name: "Test Entrant 1",
            username: reuseUsername,
            password: "password123",
            role: "Logistics",
            stationId: stationId,
            departmentId: "4630e48a-f97e-48fd-a901-864b591c282f"
        };

        console.log("=> Sending payload 1:", payload1.username);

        const createUserRes1 = await axios.post(`${API_URL}/users`, payload1, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log("=> Data Entrant 1 created successfully.");

        // Soft delete user 1 first to clear unique constraint on public.users
        console.log("=> Simulating soft delete of User 1...");
        const updateRes = await axios.put(`${API_URL}/users/${payload1.id}`, { status: 'Deleted' }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        // 3. Duplicate Username Payload
        const payload2 = {
            id: uuidv4(),
            name: "Test Entrant 2 (Reused Username)",
            username: reuseUsername,
            password: "password123",
            role: "Logistics",
            stationId: stationId,
            departmentId: "4630e48a-f97e-48fd-a901-864b591c282f"
        };

        console.log("=> Sending payload 2 (Testing Auth Collision Bypass):", payload2.username);

        const createUserRes2 = await axios.post(`${API_URL}/users`, payload2, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log("=> Data Entrant 2 created successfully (Collision bypassed).");

    } catch (e) {
        let errMessage = e.message;
        if (e.response) {
            errMessage = JSON.stringify(e.response.data);
            console.log("Error status:", e.response.status);
        }
        console.error("API ERROR:", errMessage);
    }
}

testEntrantCreation();
