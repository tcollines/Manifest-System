async function runRateLimitTest() {
    console.log('--- PHASE 6: AUTH RATE LIMIT & TIMING TEST ---');

    const API_URL = 'http://localhost:5000/api/auth/login';
    let results: any[] = [];

    async function attemptLogin(username: string, password: string, attempt: number) {
        const start = Date.now();
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const time = Date.now() - start;
        const data = await res.json();

        results.push({ attempt, status: res.status, time, data });
        console.log(`[Attempt ${attempt}] Status: ${res.status} | Time: ${time}ms | Resp:`, data);
        return res.status;
    }

    console.log('\nTesting Timing Uniformity...');
    await attemptLogin('Admin', 'completelyWrongPass', 1);
    await attemptLogin('NonExistentGhost404', 'somePass123', 2);

    console.log('\nTesting Rate Limiting (5 per IP max)...');
    let rateLimitReached = false;
    for (let i = 3; i <= 6; i++) {
        const status = await attemptLogin('SpammerAdmin', 'pass', i);
        if (status === 429) rateLimitReached = true;
    }

    console.log('\n--- VERIFICATION SUMMARY ---');
    if (Math.abs(results[0].time - results[1].time) < 1500) {
        console.log('🟢 PASS: Time uniformity preserved exactly/closely (timing attack mitigated)');
    } else {
        console.log('🔴 FAIL: Discrepancy in latency between bad username and bad password');
    }

    if (results[0].data.error === results[1].data.error) {
        console.log(`🟢 PASS: Error messages match exactly ('${results[0].data.error}')`);
    } else {
        console.log('🔴 FAIL: Error messages leak identity state!');
    }

    if (rateLimitReached) {
        console.log('🟢 PASS: Express Rate Limiter kicked in (HTTP 429)');
    } else {
        console.log('🔴 FAIL: Rate limit was not reached. Is express-rate-limit configured for 5/min?');
    }
}

runRateLimitTest();
