import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function exhaustiveCheck() {
    console.log('--- EXHAUSTIVE IDENTITY CHECK ---');

    // 1. Fetch ALL current members
    let allMembers: any[] = [];
    let lastId = '';
    let hasMore = true;
    while (hasMore) {
        const { data, error } = await supabase.from('members').select('id, name, name_norm, phone_last9, residency_norm').gt('id', lastId).order('id').limit(1000);
        if (error || !data || data.length === 0) { hasMore = false; break; }
        allMembers = allMembers.concat(data);
        lastId = data[data.length - 1].id;
    }
    console.log(`Total current members in DB: ${allMembers.length}`);

    // 2. Fetch ALL S378 orphan IDs
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId);
    if (!att) return;
    const orphanIds = Array.from(new Set(att.map(a => a.member_id)));

    // 3. Load Backup
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const identityMap: Record<string, any> = {};
    backup.forEach((m: any) => identityMap[m.id] = m);

    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));
    const legMap: Record<string, string> = {};
    mapping.forEach((m: any) => legMap[m.new_id] = m.legacy_id);

    // 4. Analyze Failures
    let missingIdentities = 0;
    let matchingIdentities = 0;

    for (const orphanId of orphanIds) {
        const legId = legMap[orphanId] || orphanId;
        const identity = identityMap[legId];

        if (!identity) {
            missingIdentities++;
            continue;
        }

        // Check if ANY current member matches by NAME or PHONE
        const matches = allMembers.filter(m =>
            m.name_norm === identity.name_norm ||
            (m.phone_last9 === identity.phone_last9 && identity.phone_last9 !== '')
        );

        if (matches.length > 0) {
            matchingIdentities++;
        }
    }

    console.log(`Summary:`);
    console.log(`Orphan IDs: ${orphanIds.length}`);
    console.log(`Orphans without Backup identity: ${missingIdentities}`);
    console.log(`Orphans with Potential Matches in current DB: ${matchingIdentities}`);
}

exhaustiveCheck();
