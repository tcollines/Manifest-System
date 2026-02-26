import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function traceArthur() {
    const name_norm = 'MWONDHA ARTHUR';

    // 1. Search in Backup
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const backupMatches = backup.filter((m: any) => m.name_norm === name_norm);
    console.log('Backup matches for Arthur:', backupMatches.map((m: any) => ({ id: m.id, name: m.name })));

    // 2. Search in Mapping (Legacy IDs)
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));
    const legacyIds = backupMatches.map((m: any) => m.id);
    const mappingMatches = mapping.filter((m: any) => legacyIds.includes(m.legacy_id));
    console.log('Mapping matches for Arthur (New IDs):', mappingMatches);

    // 3. Search in service_attendance for ANY of these IDs (Legacy or New)
    const allPossibleIds = [
        ...legacyIds,
        ...mappingMatches.map((m: any) => m.new_id),
        '18b6ed8c-61ca-4e20-9990-2ff05f889ef5' // Current Master ID
    ];

    const { data: attendance } = await supabase.from('service_attendance')
        .select('service_id, member_id')
        .in('member_id', allPossibleIds);

    console.log('Attendance records found for any Arthur ID:', attendance);
}

traceArthur();
