const http = require('http');

const data = JSON.stringify({
    username: "Aloysius",
    password: "123456"
});

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log(`Login Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
            const { session } = JSON.parse(body);
            const token = session.access_token;

            const req2 = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/users/profile',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }, res2 => {
                let body2 = '';
                res2.on('data', d => body2 += d);
                res2.on('end', () => {
                    console.log(`Profile Status: ${res2.statusCode}`);
                    console.log(`Profile Body: ${body2}`);
                });
            });

            req2.on('error', console.error);
            req2.end();
        } else {
            console.log(`Login Body: ${body}`);
        }
    });
});

req.on('error', console.error);
req.write(data);
req.end();
