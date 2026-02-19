
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/children', // Adjust endpoint if needed
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json) && json.length > 0) {
                console.log("Keys in first child:", Object.keys(json[0]));
                // Check deep keys if backend maps them
                console.log("Sample Child:", JSON.stringify(json[0], null, 2));
            } else {
                console.log("No children found or invalid response:", data.substring(0, 200));
            }
        } catch (e) {
            console.error("JSON Parse Error:", e.message);
            console.log("Raw Data:", data.substring(0, 200));
        }
    });
});

req.on('error', (e) => {
    console.error(`Request Error: ${e.message}`);
});

req.end();
