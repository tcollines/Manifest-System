const http = require('http');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const token = jwt.sign({
    sub: 'test',
    email: 'test@manifest.com',
    app_metadata: {
        manifest_id: '593fbdbb-8211-44ca-b3e2-8d999c88680c'
    }
}, process.env.SUPABASE_JWT_SECRET);

const payload = JSON.stringify({
    id: crypto.randomUUID(),
    name: 'Abraham',
    role: 'Dept Admin',
    department_id: '0b685c69-edb6-44b9-8f21-1a11878b6d7b',
    contact: '256742399921',
    email: 'tumweabra@gmail.com',
    password: 'PENDING_123',
    invitation_token: '123',
    status: 'Pending'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/users',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(payload)
    }
};

const req = http.request(options, (res) => {
    let raw = '';
    res.on('data', (c) => raw += c);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', raw));
});

req.on('error', (e) => console.error(e));
req.write(payload);
req.end();
