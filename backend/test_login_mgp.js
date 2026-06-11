require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testLogin() {
    const MGP_EVENT_ID = '7ebca242-9f6b-43f9-aa5a-06355ef5c1f4';
    
    // Find a temp user in MGP VIII
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, username, email, role, password')
        .in('role', ['Logistics', 'Stage Coordinator', 'Vehicle Coordinator', 'Coordinator', 'Resident Coordinator'])
        .eq('event_id', MGP_EVENT_ID)
        .limit(1);
        
    if (error || users.length === 0) {
        console.error("No MGP VIII temp users found to test.", error);
        return;
    }
    
    const user = users[0];
    console.log(`Testing Login for MGP VIII Temp User: ${user.name}`);
    console.log(`- Username: ${user.username}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- DB Password Column: ${user.password}`);
    
    try {
        // Assume backend is running locally
        const API_URL = 'http://localhost:5000/api';
        
        // Use username to login, just like the frontend
        const identifier = user.username || user.email;
        console.log(`=> Firing login request with username: '${identifier}' and password: '123'`);
        
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: identifier,
            password: '123'
        });
        
        if (loginRes.data && loginRes.data.session) {
            console.log("=> [SUCCESS] Login successful! Session token acquired.");
        } else {
            console.log("=> [FAIL] Login returned 200 but no session token.");
        }
    } catch (e) {
        let errMessage = e.message;
        if (e.response) {
            errMessage = JSON.stringify(e.response.data);
            console.log("=> [FAIL] Error status:", e.response.status);
        }
        console.error("=> [FAIL] API ERROR:", errMessage);
    }
}

testLogin();
