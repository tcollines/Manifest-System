const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function testFullFlow() {
    try {
        console.log("== Starting Full Flow Test ==");

        // 1. Authenticate as Admin (required to hit POST /users)
        // Aine Francis is a valid user (username: 'aine', password: 'password123' based on early logs)
        console.log("1. Logging in as Admin...");
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'aine',
            password: 'password123'
        });
        const adminToken = adminRes.data.session.access_token;
        console.log("=> Admin logged in.");

        // 2. Create New Coordinator
        const newUsername = `testcord${Date.now()}`;
        console.log(`2. Creating new coordinator: ${newUsername}`);

        const createUserRes = await axios.post(`${API_URL}/users`, {
            name: "Test Coordinator",
            username: newUsername,
            password: "password123",
            role: "Vehicle Coordinator",
            contact: "256770112233"
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log("=> Coordinator created successfully.");

        // 3. Login as New Coordinator
        console.log("3. Logging in as new coordinator...");
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: newUsername,
            password: 'password123'
        });
        const userToken = loginRes.data.session.access_token;
        console.log("=> Coordinator logged in, JWT obtained.");

        // 4. Test Fetching Profile (To ensure middleware accepts the baked manifest_id)
        console.log("4. Fetching profile to test auth middleware...");
        const profileRes = await axios.get(`${API_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });

        console.log("=> Profile Fetch Success!", profileRes.data.name);

        fs.writeFileSync('flow_results.json', JSON.stringify({ success: true, user: profileRes.data }, null, 2));

    } catch (e) {
        let errMessage = e.message;
        if (e.response) {
            errMessage = JSON.stringify(e.response.data);
            console.log("Error status:", e.response.status);
        }
        console.error("FLOW ERROR:", errMessage);
        fs.writeFileSync('flow_results.json', JSON.stringify({ success: false, error: errMessage }, null, 2));
    }
}

testFullFlow();
