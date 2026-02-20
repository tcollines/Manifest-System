import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from .env relative to this script
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
// For login we use the anon key.
const supabaseAnonKey = process.env.SUPABASE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// We need a known user from the DB to test login.
// Since the script runs as admin, let's fetch one from public.users to get their password.
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testJwt() {
    console.log("Fetching a random user from public.users...");

    // Pick any user that has a plain text password (which most do based on userStore.ts)
    const { data: users, error: dbError } = await supabaseAdmin
        .from('users')
        .select('*')
        .neq('password', '')
        .limit(1);

    if (dbError || !users || users.length === 0) {
        console.error("Failed to fetch a test user.", dbError);
        process.exit(1);
    }

    const testUser = users[0];
    const email = `${testUser.username.replace(/ /g, '').replace(/@/g, '_').toLowerCase()}@manifest.local`;
    const password = testUser.password;

    console.log(`Attempting login for ${email}...`);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error("Login failed!", authError.message);
        console.log("Note: If it says invalid credentials, it might be due to a disambiguated email (_uuid suffix).");
        // Try fallback
        const shortId = testUser.id.substring(0, 8);
        const fallbackEmail1 = `${testUser.username.replace(/ /g, '').replace(/@/g, '_').toLowerCase()}_${shortId}@manifest.local`;
        console.log(`Retrying with fallback 1: ${fallbackEmail1}`);
        const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
            email: fallbackEmail1,
            password
        });

        if (authError2) {
            const fullIdNoHyphens = testUser.id.replace(/-/g, "");
            const fallbackEmail2 = `${testUser.username.replace(/ /g, '').replace(/@/g, '_').toLowerCase()}_${fullIdNoHyphens}@manifest.local`;
            console.log(`Retrying with fallback 2: ${fallbackEmail2}`);
            const { data: authData3, error: authError3 } = await supabase.auth.signInWithPassword({
                email: fallbackEmail2,
                password
            });

            if (authError3) {
                console.error("All login attempts failed.", authError3);
                process.exit(1);
            } else {
                verifyClaims(authData3.session, testUser);
            }
        } else {
            verifyClaims(authData2.session, testUser);
        }
    } else {
        verifyClaims(authData.session, testUser);
    }
}

function verifyClaims(session: any, dbUser: any) {
    if (!session || !session.access_token) {
        console.error("No session/JWT returned.");
        process.exit(1);
    }

    // Decode JWT payload (without verifying signature, just inspecting content)
    const payloadEncoded = session.access_token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64').toString());

    console.log("\n--- JWT Verification ---");
    console.log(`Subject (Auth ID): ${payload.sub}`);
    console.log(`Expected DB ID:  ${dbUser.id}`);

    if (payload.sub !== dbUser.id) {
        console.error("❌ ID MISMATCH! Supabase Auth ID does not match public.users.id.");
        process.exit(1);
    }
    console.log("✅ ID Matches perfectly.");

    // Check App Metadata claims
    const appMetadata = payload.app_metadata || {};
    console.log("\nApp Metadata Claims:");
    console.log(`manifest_id: ${appMetadata.manifest_id}`);
    console.log(`role: ${appMetadata.role}`);

    if (appMetadata.manifest_id !== dbUser.manifest_id) {
        console.error(`❌ manifest_id MISMATCH! Expected ${dbUser.manifest_id}, got ${appMetadata.manifest_id}`);
        process.exit(1);
    }

    if (appMetadata.role !== dbUser.role) {
        console.error(`❌ role MISMATCH! Expected ${dbUser.role}, got ${appMetadata.role}`);
        process.exit(1);
    }

    console.log("✅ All claims verified perfectly. Ready for Backend Refactor.");
    process.exit(0);
}

testJwt();
