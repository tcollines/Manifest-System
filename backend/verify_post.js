
const http = require('http');

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data || '{}')));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

(async () => {
    try {
        const id = `test-js-${Date.now()}`;
        console.log('1. Posting Child with category="First Timer"...');
        const res = await request('POST', '/children', {
            id: id,
            name: 'JS Verification Child',
            category: 'First Timer',
            status: 'Checked In',
            joined_date: new Date().toISOString()
        });
        console.log('   Response:', res);

        console.log('2. Fetching Child...');
        // Since individual GET might fail if route missing, fetch all and find
        const all = await request('GET', '/children');
        const found = all.find(c => c.id === id);

        if (found) {
            console.log('   Found Record:', JSON.stringify({ name: found.name, category: found.category }, null, 2));
            if (found.category === 'First Timer') {
                console.log('✅ SUCCESS: Persistence Valid.');
            } else {
                console.log('❌ FAILURE: Persistence Invalid (Got ' + found.category + ')');
            }
        } else {
            console.log('❌ FAILURE: Could not find created record.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
})();
