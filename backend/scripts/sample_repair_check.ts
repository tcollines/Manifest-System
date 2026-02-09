import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function sampleCheck() {
    const serviceId = '38975f9c-5f10-4a62-8917-3ecd94896a76';

    // 1. Get 1 record from service_attendance for S378 UUID
    const { data: att } = await supabase.from('service_attendance').select('member_id').eq('service_id', serviceId).limit(1);
    if (!att || att.length === 0) {
        console.log('No attendance found for UUID'); return;
    }
    const mid = att[0].member_id;
    console.log(`Sample member_id in attendance: ${mid}`);

    // 2. Check if this ID exists in members
    const { data: mem } = await supabase.from('members').select('id, name').eq('id', mid).single();
    console.log(`Member in DB for this ID:`, mem || 'NOT FOUND');

    // 3. If NOT FOUND, find who it SHOULD have been
    // We need the mapping to find the legacy ID, then the backup to find the name.
    const fs = require('fs');
    const mapping = JSON.parse(fs.readFileSync('d:/Manifest System/backend/migration_mapping.json', 'utf8'));
    const m = mapping.find((x: any) => x.new_id === mid);
    if (m) {
        console.log(`Mapping found: Legacy ID ${m.legacy_id}`);
        const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
        const b = backup.find((x: any) => x.id === m.legacy_id);
        if (b) {
            console.log(`Backup Identity: ${b.name} (${b.phone})`);
            // Search for him in members NOW
            const { data: current } = await supabase.from('members')
                .select('id, name')
                .eq('name_norm', b.name_norm)
                .eq('phone_last9', b.phone_last9);
            console.log(`Current Master in DB matching this identity:`, current);
        }
    }
}

sampleCheck();
