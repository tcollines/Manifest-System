const https = require('https');
const url = 'https://manifest-system-esft.onrender.com/api/admin/drop-trigger';
console.log('Waiting for deployment and pinging trigger endpoint...');

let attempts = 0;
const interval = setInterval(() => {
    attempts++;
    process.stdout.write(`Attempt ${attempts}... `);
    https.get(url, (res) => {
        let rawData = '';
        res.on('data', (chunk) => rawData += chunk);
        res.on('end', () => {
            console.log(`HTTP ${res.statusCode}: ${rawData.substring(0, 100)}`);
            // If we got success from our custom route, stop.
            if (res.statusCode === 200 && rawData.includes('success')) {
                clearInterval(interval);
                console.log('\nDeployment live! Trigger successfully dropped via backend API proxy.');
            }
        });
    }).on('error', (e) => {
        console.log(`Error: ${e.message}`);
    });

    if (attempts > 30) {
        clearInterval(interval);
        console.log('Timeout waiting for deployment (2.5 mins)');
    }
}, 5000);
