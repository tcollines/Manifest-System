import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function deepTrace() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const legacyS378 = 'S378';

    // 1. Data Sources
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    // We only care about people who were in S378? Actually we don't know who they were.
    // So let's search for everyone? No, too slow.

    // Let's get the orphans again.
    const { data: att } = await supabase.from('service_attendance').select('id, member_id').eq('service_id', uuid);
    if (!att) return;

    const ids = Array.from(new Set(att.map(a => a.member_id)));
    const { data: mems } = await supabase.from('members').select('id').in('id', ids);
    const memSet = new Set(mems?.map(m => m.id));
    const orphans = att.filter(a => !memSet.has(a.member_id));

    console.log(`Deep tracing ${orphans.length} orphan records...`);

    // We need identities for these orphans.
    // Since they aren't in mapping/backup by ID, let's assume they might be in backup by... nothing?
    // Wait! If they are UUIDs and not in mapping, they must be NEW members.
    // If they are NEW members, maybe we can find them in the DB by... something?
    // Oh! If they were merged, they should have a name_norm that still exists!

    // BUT WE DONT HAVE THEIR NAME_NORM because they are deleted!

    // WAIT!!!
    // There is one more place: the 'passengers' table sometimes keeps records of 'member_id'.
    // I searched it and found 0.

    // IS THERE ANY OTHER BACKUP?
    // I'll check the 'backups' folder again for ANY other files.
    // I'll also check the 'logs' folder.
}

deepTrace();
