import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function arthurCrossCheck() {
    console.log('--- ARTHUR IDENTITY CROSS-CHECK ---');

    // 1. Current DB Identity
    const { data: dbArthur } = await supabase.from('members')
        .select('id, name, name_norm, phone_last9, residency_norm')
        .ilike('name', '%Mwondha Arthur%')
        .single();

    console.log('Current DB Identity:', dbArthur);

    // 2. Backup Identity
    const backup = JSON.parse(fs.readFileSync('d:/Manifest System/backend/backups/members_backup_1770573673385.json', 'utf8'));
    const bArthur = backup.find((m: any) => m.name.toUpperCase().includes('MWONDHA ARTHUR'));

    console.log('Backup Identity:', bArthur ? {
        id: bArthur.id,
        name: bArthur.name,
        name_norm: bArthur.name_norm,
        phone_last9: bArthur.phone_last9,
        residency_norm: bArthur.residency_norm
    } : 'NOT FOUND IN BACKUP');

    if (dbArthur && bArthur) {
        const matches = dbArthur.name_norm === bArthur.name_norm &&
            dbArthur.phone_last9 === bArthur.phone_last9 &&
            dbArthur.residency_norm === bArthur.residency_norm;
        console.log(`Direct Match: ${matches}`);
    }
}

arthurCrossCheck();
