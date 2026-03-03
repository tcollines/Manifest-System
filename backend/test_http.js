const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/vehicles?eventId=f3976613-0887-4138-b2e1-63a8a5824cdd',
    method: 'GET',
    headers: {
        'X-Manifest-Id': '593fbdbb-8211-44ca-b3e2-8d999c88680c'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('HTTP Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log(`Returned ${json.length || Object.keys(json)} vehicles/keys`);
            if (Array.isArray(json) && json.length > 0) {
                console.log('Sample Event ID in payload:', json[0].event_id);
            }
        } catch (e) {
            console.log('Raw text:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem: ${e.message}`);
});
req.end();
