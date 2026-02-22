const jwt = require('jsonwebtoken');

const SECRET = process.env.SUPABASE_JWT_SECRET || 'test-secret';

function createToken(payload, options) {
    return jwt.sign(payload, SECRET, options);
}

// 1. Valid Token
const validToken = createToken({ sub: 'user123', email: 'test@example.com', app_metadata: { manifest_id: 'tenant-1' } }, { expiresIn: '1h' });

// 2. Expired Token
const expiredToken = createToken({ sub: 'user123', email: 'test@example.com', app_metadata: { manifest_id: 'tenant-1' } }, { expiresIn: '-1h' });

// 3. Missing manifest_id Token
const missingTenantToken = createToken({ sub: 'user123', email: 'test@example.com' }, { expiresIn: '1h' });

// 4. Missing required basic claims (no email/sub)
const invalidClaimsToken = createToken({ role: 'admin' }, { expiresIn: '1h' });

// 5. Modified Payload (Signature will fail)
const modifiedToken = validToken.substring(0, validToken.lastIndexOf('.')) + '.invalidSignature';

console.log("VALID_TOKEN=" + validToken);
console.log("EXPIRED_TOKEN=" + expiredToken);
console.log("MISSING_TENANT_TOKEN=" + missingTenantToken);
console.log("INVALID_CLAIMS_TOKEN=" + invalidClaimsToken);
console.log("MODIFIED_TOKEN=" + modifiedToken);
