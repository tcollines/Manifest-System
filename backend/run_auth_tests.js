const axios = require('axios');

async function testTokens() {
    const tokens = {
        VALID: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7Im1hbmlmZXN0X2lkIjoidGVuYW50LTEifSwiaWF0IjoxNzA4NjA2ODU0LCJleHAiOjE3MDg2MTA0NTR9.P77tU5p6Z2a5vG44T31C0PqK0-aK5P_0hT2LqF249M0',
        EXPIRED: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7Im1hbmlmZXN0X2lkIjoidGVuYW50LTEifSwiaWF0IjoxNzA4NjA2ODU0LCJleHAiOjE3MDg2MDMyNTR9.Y9N6V9C63G6j22P0s-U8vT6u57D9fF831yX2BqR-fP4',
        MISSING_TENANT: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzA4NjA2ODU0LCJleHAiOjE3MDg2MTA0NTR9.O_gL9v6j59R6c4K7V3f88zP9oJ3h0qT4mO-3K1WJ6x8',
        INVALID_CLAIMS: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDg2MDY4NTQsImV4cCI6MTcwODYxMDQ1NH0.Q-P2ZqB5XpL8S_wT5aV3nK8gM3o-9eC5R6_3X8K9M8A',
        MODIFIED: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiYXBwX21ldGFkYXRhIjp7Im1hbmlmZXN0X2lkIjoidGVuYW50LTEifSwiaWF0IjoxNzA4NjA2ODU0LCJleHAiOjE3MDg2MTA0NTR9.invalidSignature'
    };

    for (const [name, token] of Object.entries(tokens)) {
        console.log(`\n--- Testing ${name} TOKEN ---`);
        try {
            const res = await axios.get('http://localhost:5001/test-auth', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`STATUS: ${res.status}`);
            console.log(`DATA:`, res.data);
        } catch (error) {
            console.log(`STATUS: ${error.response ? error.response.status : 'Network Error'}`);
            console.log(`ERROR DATA:`, error.response ? error.response.data : error.message);
        }
    }
}

testTokens();
