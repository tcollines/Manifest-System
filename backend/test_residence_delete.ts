import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: manifest } = await supabase.from('manifest_details').select('id').limit(1).single();
    if (!manifest) { console.error("No manifest"); return; }
    const manifestId = manifest.id;

    console.log("Creating test residence...");
    const { data: resData, error: resErr } = await supabase.from('residences').insert({
        name: 'TEST_DELETE_RESIDENCE',
        manifest_id: manifestId,
        coordinator_name: 'Test Coord',
        coordinator_email: 'test@coord.com'
    }).select().single();

    if (resErr) { console.error("Res Err:", resErr); return; }

    console.log("Creating test member...");
    // 2. Create a dummy member linked to this residence
    const { data: memData, error: memErr } = await supabase.from('members').insert({
        name: 'Test Delete Member',
        residency: 'TEST_DELETE_RESIDENCE', // Currently linked via string name!
        manifest_id: manifestId
    }).select().single();

    if (memErr) { console.error("Mem Err:", memErr); return; }

    console.log("Member created ID:", memData.id);

    // 3. Delete the residence using the same logic as the controller
    console.log("Deleting residence...");

    // Controller logic step 2
    await supabase.from('members').update({ residency: null }).eq('residency', 'TEST_DELETE_RESIDENCE');

    // Controller logic step 4
    await supabase.from('residences').delete().eq('id', resData.id);

    console.log("Checking if member still exists...");
    const { data: finalMem } = await supabase.from('members').select('*').eq('id', memData.id).maybeSingle();

    if (finalMem) {
        console.log("SUCCESS: Member still exists!", finalMem.name, "Residency:", finalMem.residency);
        // Clean up
        await supabase.from('members').delete().eq('id', memData.id);
    } else {
        console.error("FAIL: Member was deleted!");
    }
}

check();
