import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function recoverIdentities() {
    const uuid = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));

    // Create maps
    const backupMap: Record<string, any> = {};
    backup.forEach((m: any) => backupMap[m.id] = m);

    const legacyMap: Record<string, string> = {};
    mapping.forEach((m: any) => legacyMap[m.new_id] = m.legacy_id);

    // Get all attendance for S378
    // Since literal UUID eq might fail due to hidden chars, we'll fetch ALL and filter
    const { data: allAtt } = await supabase.from('service_attendance').select('member_id, service_id');
    const s378Records = allAtt?.filter(a => a.service_id.includes('378') || a.service_id === uuid) || [];

    console.log(`Found ${s378Records.length} records for S378.`);

    const identities: any[] = [];
    for (const record of s378Records) {
        let legId = legacyMap[record.member_id] || record.member_id;
        let identity = backupMap[legId];

        if (identity) {
            identities.push({
                member_id: record.member_id,
                name: identity.name,
                phone: identity.phone,
                in_backup: true
            });
        } else {
            // Check current members table
            const { data: mem } = await supabase.from('members').select('name').eq('id', record.member_id).single();
            identities.push({
                member_id: record.member_id,
                name: mem?.name || 'UNKNOWN',
                in_backup: false
            });
        }
    }

    fs.writeFileSync('d:/Manifest System/backend/scripts/s378_identities_recovered.json', JSON.stringify(identities, null, 2));
    console.log(`Recovered ${identities.filter(i => i.name !== 'UNKNOWN').length} identities out of ${identities.length}`);
}

recoverIdentities();
