import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function traceOrphanIdentitiesFile() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    let output = '# Orphan Identities Trace\n\n';

    // 1. Get orphans
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

    // 2. Load Mapping/Backup
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const newToLegacy: Record<string, string> = {};
    mapping.forEach((m: any) => newToLegacy[m.new_id] = m.legacy_id);
    const backupMap: Record<string, any> = {};
    backup.forEach((m: any) => backupMap[m.id] = m);

    for (const oid of orphans) {
        const legId = newToLegacy[oid];
        output += `### Orphan ID: ${oid}\n`;
        if (legId && backupMap[legId]) {
            const b = backupMap[legId];
            output += `- Legacy ID: ${legId}\n`;
            output += `- Identity: ${b.name} | ${b.phone} | ${b.residency}\n`;
            output += `- Norms: ${b.name_norm} | ${b.phone_last9} | ${b.residency_norm}\n`;

            const { data: matches } = await supabase.from('members').select('id, name, name_norm, phone_last9, residency_norm').ilike('name_norm', `%${b.name_norm}%`);
            output += `- Potential matches in DB (${matches?.length || 0}):\n`;
            matches?.forEach(m => {
                output += `  - ${m.id} | ${m.name} | ${m.phone_last9} | ${m.residency_norm}\n`;
            });
        } else {
            output += `- NO MAPPING/BACKUP FOUND\n`;
        }
        output += `\n---\n\n`;
    }

    fs.writeFileSync('d:/Manifest System/backend/scripts/orphan_identities.md', output);
    console.log('Results written to d:/Manifest System/backend/scripts/orphan_identities.md');
}

traceOrphanIdentitiesFile();
