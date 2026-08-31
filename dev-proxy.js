/**
 * Dev Proxy Server — Port 3001
 * 
 * Routes by hostname:
 *   localhost:3001        → Frontend (port 3100)
 *   admin.localhost:3001  → Admin Council (port 3200)
 */

const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({ ws: true });

const FRONTEND_TARGET = 'http://localhost:3100';
const ADMIN_TARGET = 'http://localhost:3200';

function getTarget(host) {
    if (host && host.startsWith('admin.')) {
        return ADMIN_TARGET;
    }
    return FRONTEND_TARGET;
}

const server = http.createServer((req, res) => {
    const host = (req.headers.host || '').split(':')[0];
    const target = getTarget(host);
    proxy.web(req, res, { target }, (err) => {
        console.error(`[PROXY] Error forwarding to ${target}:`, err.message);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end(`Proxy error: ${err.message}`);
    });
});

// WebSocket upgrade (for Vite HMR)
server.on('upgrade', (req, socket, head) => {
    const host = (req.headers.host || '').split(':')[0];
    const target = getTarget(host);
    proxy.ws(req, socket, head, { target }, (err) => {
        console.error(`[PROXY WS] Error:`, err.message);
        socket.destroy();
    });
});

server.listen(3001, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║          Manifest Dev Proxy — Port 3001         ║');
    console.log('  ╠══════════════════════════════════════════════════╣');
    console.log('  ║  Frontend:      http://localhost:3001           ║');
    console.log('  ║  Admin Council: http://admin.localhost:3001     ║');
    console.log('  ║  Backend:       http://localhost:5000           ║');
    console.log('  ╚══════════════════════════════════════════════════╝');
    console.log('');
});
