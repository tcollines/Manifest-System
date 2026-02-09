import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function traceOrphanIdentities() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Get 10 orphans
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', uuid);
    const ids = Array.from(new Set(att?.map(a => a.member_id) || []));

    const orphans: string[] = [];
    const CHUNK = 50;
    for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { data } = await supabase.from('members').select('id').in('id', chunk);
        const existing = new Set(data?.map(m => m.id));
        chunk.forEach(id => {
            if (!existing.has(id) && orphans.length < 10) orphans.push(id);
        });
        if (orphans.length >= 10) break;
    }

    console.log(`Analyzing 10 orphans:`, orphans);

    // 2. Load Mapping/Backup
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const newToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => newToLegacy[m.new_id] = m.legacy_id);
    const backupMap: Record<string, any> = {};
    backup.forEach((m: any) => backupMap[m.id] = m);

    for (const oid of orphans) {
        const legId = newToLegacy[oid];
        if (legId && backupMap[legId]) {
            const b = backupMap[legId];
            console.log(`\nOrphan ID: ${oid}`);
            console.log(`Identity: ${b.name} | ${b.phone} | ${b.residency}`);
            console.log(`Norms: ${b.name_norm} | ${b.phone_last9} | ${b.residency_norm}`);

            // Search in DB by name only to see if there's a slight mismatch
            const { data: matches } = await supabase.from('members').select('id, name, name_norm, phone_last9, residency_norm').ilike('name_norm', `%${b.name_norm}%`);
            console.log(`Potential matches in DB:`, matches);
        } else {
            console.log(`\nNo mapping/backup found for orphan ${oid}`);
        }
    }
}

traceOrphanIdentities();
