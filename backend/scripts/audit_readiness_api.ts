
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error("Missing SUPABASE Credentials"); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function audit() {
    let output = "--- DATA AUDIT (Via Supabase API) ---\n";

    // 1. DATA COMPLIANCE
    const { data: users, error: userError } = await supabase.from('users').select('id');
    if (userError) output += `USERS Error: ${userError.message}\n`;
    else {
        const total = users.length;
        const valid = users.filter(u => UUID_REGEX.test(u.id)).length;
        output += `USERS: Total=${total}, Valid=${valid} (${((valid / total) * 100).toFixed(1)}%)\n`;
    }

    const { data: pv, error: pvError } = await supabase.from('personal_vehicles').select('id');
    if (pvError) output += `PV Error: ${pvError.message}\n`;
    else {
        const total = pv.length;
        const valid = pv.filter(p => UUID_REGEX.test(p.id)).length;
        output += `PV: Total=${total}, Valid=${valid} (${((valid / total) * 100).toFixed(1)}%)\n`;
    }

    // 2. DEFAULT VALUE TEST (Insert without ID)
    output += "\n--- DEFAULT VALUE TEST ---\n";

    // USERS TEST
    // We need strict minimal payload. Looking at controller, username/password might be required?
    // Let's try to insert a dummy row and see if it generates an ID, then delete it.
    // Users might have other constraints (username unique?).
    const testUser = { username: `audit_test_${Date.now()}`, role: 'Logistics', status: 'Active' };
    const { data: uData, error: uErr } = await supabase.from('users').insert(testUser).select().single();

    if (uErr) {
        output += `USERS INSERT TEST: FAILED (${uErr.message})\n`;
    } else {
        if (UUID_REGEX.test(uData.id)) {
            output += `USERS INSERT TEST: PASSED (Generated UUID: ${uData.id})\n`;
            // Cleanup
            await supabase.from('users').delete().eq('id', uData.id);
        } else {
            output += `USERS INSERT TEST: WARNING (Generated NON-UUID: ${uData.id})\n`;
        }
    }

    // PV TEST
    const testPV = { name: `Audit Car`, license_plate: `AUDIT-${Date.now()}`, capacity: 4 };
    const { data: pvData, error: pvErr } = await supabase.from('personal_vehicles').insert(testPV).select().single();

    if (pvErr) {
        output += `PV INSERT TEST: FAILED (${pvErr.message})\n`;
    } else {
        if (UUID_REGEX.test(pvData.id)) {
            output += `PV INSERT TEST: PASSED (Generated UUID: ${pvData.id})\n`;
            await supabase.from('personal_vehicles').delete().eq('id', pvData.id);
        } else {
            output += `PV INSERT TEST: WARNING (Generated NON-UUID: ${pvData.id})\n`;
        }
    }

    console.log(output);
    fs.writeFileSync('audit_result.txt', output);
}

audit();
