import { updateUser } from './src/controllers/userController';
import { supabase, supabaseAnon } from './src/supabase';

function createMockRes() {
    let result: any = {};
    return {
        status: function (code: number) { this.statusCode = code; return this; },
        json: function (data: any) { this.data = data; result = { status: this.statusCode || 200, data }; return result; },
        getResult: () => result
    };
}

async function runPhase7() {
    console.log('--- PHASE 7: ACCOUNT CREATION FLOW SIMULATION ---');

    // 1. Admin Invites New User
    console.log('1. Admin creates public.users row natively...');
    const mockId = crypto.randomUUID();
    const mockEmail = `new_${Date.now()}@manifest.local`;

    // Get Manifest ID
    const { data: userRow } = await supabase.from('users').select('manifest_id').limit(1).single();
    const manifestId = userRow?.manifest_id;

    // Direct insertion simulating the Admin dashboard action
    const { error: insErr } = await supabase.from('users').insert([{
        id: mockId,
        name: 'New Simulated Employee',
        email: mockEmail,
        role: 'Member',
        status: 'Active',
        manifest_id: manifestId,
        username: `sim_user_${Date.now()}`
    }]);

    if (insErr) { console.error('🔴 FAIL: Could not inject mock user', insErr); return; }
    console.log('🟢 PASS: public.users row successfully assigned. ID:', mockId);

    // 2. User Completes Setup
    console.log('\n2. User Completes Setup via Proxy (Setting Username/Password)...');

    // We simulate the PUT request hit on `/api/users/:id` exactly as `AcceptInvite.tsx` would via API
    const req = {
        manifestId,
        user: { id: mockId }, // Self-mutation allowed for password/username setting context technically handled by proxy session logic
        params: { id: mockId },
        body: {
            password: 'StrongTestPassword123!',
            name: 'New Simulated Employee',
            role: 'Member' // Maintain invariant bounds
        }
    } as any;

    const res = createMockRes() as any;
    await updateUser(req, res);

    const updateResult = res.getResult();
    if (updateResult.status !== 200) {
        console.error('🔴 FAIL: Account Setup mutation crashed:', updateResult);
        return;
    }
    console.log('🟢 PASS: Native Controller correctly consumed parameters.');

    // 3. Verification of Native Bridge Schema Parity (Auth.users provisioning)
    console.log('\n3. Identity Synchronicity Auditing...');
    const { data: checkData, error: checkErr } = await supabase.auth.admin.getUserById(mockId);

    if (checkErr || !checkData.user) {
        console.error('🔴 FAIL: Supabase GoTrue Bridge failed to compile explicit ID hook. Parity orphaned!');
        return;
    }
    console.log('🟢 PASS: Auth Identity successfully minted mapping strict UUID exact parity constraints.');
    console.log(`- Public ID: ${mockId}\n- Auth.Users ID: ${checkData.user.id}`);

    // 4. API Login Verification
    console.log('\n4. Attempting valid GoTrue native authentication sequence via proxy constraints...');
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
        email: mockEmail,
        password: 'StrongTestPassword123!'
    });

    if (authError || !authData.session) {
        console.log('🔴 FAIL: Log in sequence rejected valid provisioned user!', authError);
    } else {
        console.log('🟢 PASS: User is completely authenticated natively via Supabase Token Minting!');
    }

    // Cleanup Test Context
    await supabase.auth.admin.deleteUser(mockId);

    console.log('\n🟢 PHASE 7 COMPLETE');
    process.exit(0);
}

runPhase7().catch(e => { console.error(e); process.exit(1); });
