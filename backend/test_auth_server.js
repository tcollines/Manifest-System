const http = require('http');
const express = require('express');
const { authenticate } = require('./src/middleware/auth');

const app = express();
app.use(express.json());

app.get('/test-auth', authenticate, (req, res) => {
    res.json({ message: 'Authenticated', user: req.user, manifestId: req.manifestId });
});

const server = http.createServer(app);

// Keep the process alive enough to accept incoming test requests
server.listen(5001, () => {
    console.log('Test server running on port 5001');
});
