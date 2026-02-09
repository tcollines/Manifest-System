
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';

const BACKUP_PATH = 'd:/Manifest System/backend/backups/members_backup_1770573673385.json';
const BAD_ID = 'd3fe5924-f8d4-4c66-bf9e-14057a5941d6';

const normalize = (s: string) => (s || '').trim().toLowerCase();
const phoneNorm = (p: string) => (p || '').replace(/\D/g, '').slice(-9);

export const debug = async () => {
    console.log(`--- DEBUGGING ID: ${BAD_ID} ---`);

    // 1. Find in backup
    const backupRaw = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
    const backupMember = backupRaw.find(m => m.id === BAD_ID);

    if (backupMember) {
        console.log('Found in Backup:', backupMember.name, backupMember.phone, backupMember.residency);
        const searchKey = `${normalize(backupMember.name)}|${phoneNorm(backupMember.phone)}|${normalize(backupMember.residency)}`;
        console.log('Search Key:', searchKey);

        // 2. Search in current database by name (fuzzy)
        const { data: matches, error } = await supabase.from('members').select('*').ilike('name', `%${backupMember.name.split(' ')[0]}%`);
        if (error) console.error(error);

        console.log(`Current DB Matches by name prefix (${backupMember.name.split(' ')[0]}):`);
        matches?.forEach(m => {
            console.log(`- ${m.id} | ${m.name} | ${m.phone} | ${m.residency}`);
            const currentKey = `${normalize(m.name)}|${phoneNorm(m.phone)}|${normalize(m.residency)}`;
            console.log(`  Current Key: ${currentKey}`);
            if (currentKey === searchKey) console.log('  *** PERFECT MATCH FOUND ***');
        });
    } else {
        console.log('NOT FOUND IN BACKUP.');
    }
    process.exit(0);
};

debug();
