import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function traceOrphans() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const legacy = 'S378';

    // 1. Get orphans
    const { data: allAtt } = await supabase.from('service_attendance')
        .select('member_id')
        .or(`service_id.eq.${uuid},service_id.eq.${legacy}`);

    const attendeeIds = Array.from(new Set(allAtt?.map(a => a.member_id) || []));
    const { data: mems } = await supabase.from('members').select('id').in('id', attendeeIds);
    const memSet = new Set(mems?.map(m => m.id));
    const orphans = attendeeIds.filter(id => !memSet.has(id));

    console.log(`Analyzing ${orphans.length} orphans...`);

    // 2. Load Mapping and Backup
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));
    const newToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => newToLegacy[m.new_id] = m.legacy_id);

    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const backupMap: Record<string, any> = {};
    backup.forEach((m: any) => backupMap[m.id] = m);

    let arthurFound = false;
    let firstTimerOrphans = 0;

    orphans.forEach(oid => {
        const legId = newToLegacy[oid];
        if (legId && backupMap[legId]) {
            const b = backupMap[legId];
            if (b.category === 'First Timer') firstTimerOrphans++;
            if (b.name.includes('MWONDHA ARTHUR')) {
                console.log(`FOUND ARTHUR AMONG ORPHANS! ID: ${oid}, Legacy: ${legId}`);
                arthurFound = true;
            }
        }
    });

    console.log(`Orphans that are First Timers (in backup): ${firstTimerOrphans}`);
    if (!arthurFound) {
        console.log('Arthur not found in orphans.');
    }
}

traceOrphans();
