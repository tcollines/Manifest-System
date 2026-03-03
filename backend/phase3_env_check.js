require('dotenv').config();

function decodeJWT(token) {
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const buff = Buffer.from(base64, 'base64');
        const payload = buff.toString('utf-8');
        return JSON.parse(payload);
    } catch (e) {
        return null;
    }
}

function runPhase3() {
    console.log('--- PHASE 3: ENVIRONMENT INTEGRITY CHECK ---');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    const srKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let hasErrors = false;

    if (!url) { console.log('🔴 FAIL: URL missing'); hasErrors = true; }
    else { console.log('🟢 PASS: URL exists ->', url); }

    if (!key) { console.log('🔴 FAIL: Anon Key missing'); hasErrors = true; }
    else { console.log('🟢 PASS: Anon Key exists'); }

    if (!srKey) { console.log('🔴 FAIL: SR Key missing'); hasErrors = true; }
    else { console.log('🟢 PASS: SR Key exists'); }

    // Parse keys to check if they match the same project reference ID conceptually
    // Supabase JWTs encode the project reference if standard
    const anonPayload = decodeJWT(key);
    const srPayload = decodeJWT(srKey);

    if (anonPayload && anonPayload.iss) {
        console.log('Anon Key Issuer:', anonPayload.iss);
        if (srPayload && srPayload.iss !== anonPayload.iss) {
            console.log('🔴 FAIL: Key Issuers mismatch! Possible staging cross-wiring.');
            hasErrors = true;
        } else {
            console.log('🟢 PASS: Key issuers align');
        }
    } else {
        console.log('⚠️ Could not extract JWT issuer, assuming valid standard keys');
    }

    if (anonPayload && srPayload) {
        if (anonPayload.role !== 'anon') {
            console.log('🔴 FAIL: Anon key has wrong role:', anonPayload.role);
            hasErrors = true;
        } else {
            console.log('🟢 PASS: Anon key role is anon');
        }

        if (srPayload.role !== 'service_role') {
            console.log('🔴 FAIL: SR key has wrong role:', srPayload.role);
            hasErrors = true;
        } else {
            console.log('🟢 PASS: SR key role is service_role');
        }
    }

    console.log(hasErrors ? '\n🔴 PHASE 3 ENV CHECK FAILED' : '\n🟢 PHASE 3 ENV CHECK PASSED');
    process.exit(hasErrors ? 1 : 0);
}

runPhase3();
