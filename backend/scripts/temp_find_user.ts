import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const getTestUser = async () => {
    const { data: users, error } = await supabase
        .from('users')
        .select('username, password')
        .limit(10);

    if (error || !users?.length) {
        console.error("Failed to find test user", error);
        return;
    }

    const { username, password } = users[0];

    // Construct email logic matching Phase 5.2 exactly
    let cleanUsername = username.trim().replace(/ /g, '').replace(/@/g, '_').toLowerCase();

    // Simplest default email test
    let testEmail = `${cleanUsername}@manifest.local`;
    console.log(`Testing Login: ${testEmail} / ${password}`);

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: password
    });

    if (authErr) {
        console.error("Auth Err", authErr);
        // We know from the sync script that duplicate emails were handled with appending short or full UUIDs. 
        // We will just find one that didn't need the fallback:
        const { data: simpleUsers, error: err2 } = await supabase
            .from('users')
            .select('username, password')
            .eq('role', 'Coordinator')
            .limit(10);

        for (const u of simpleUsers!) {
            const cname = u.username.trim().replace(/ /g, '').replace(/@/g, '_').toLowerCase();
            const em = `${cname}@manifest.local`;
            const { data: aData, error: aErr } = await supabase.auth.signInWithPassword({ email: em, password: u.password });
            if (!aErr) {
                console.log(`✅ FOUND WORKING USER: ${em} / ${u.password}`);
                console.log(`Manifest ID: ${aData.user.app_metadata.manifest_id}`);
                return;
            }
        }
    } else {
        console.log(`✅ FOUND WORKING USER: ${testEmail} / ${password}`);
        console.log(`Manifest ID: ${data.user.app_metadata.manifest_id}`);
    }
};

getTestUser();
