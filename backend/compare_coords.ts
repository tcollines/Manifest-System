
import { supabase } from './src/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

const INTER_SCHOOLS_UUID = '11324002-c401-494b-be68-179650967970';
const NIGHT_OF_PRAYER_UUID = 'bde9329f-2746-40b1-b2eb-56f2fcf028ee';

const mappings: Record<string, string[]> = {
    [INTER_SCHOOLS_UUID]: [
        "Aloysius Ojire", "Lukodda Joseph", "Jerry Kyobe", "Mugasha Isaac", "Helen Purpose",
        "Dorah Mwenyango", "Fredrick Balidawa", "Silas Ssemwanga", "Mwondha Arthur",
        "Birungi Monicah", "Kyobugira Betty", "Namara Angel", "Anitah Tukei", "Ben Kutosi"
    ],
    [NIGHT_OF_PRAYER_UUID]: [
        "Sarah Night", "Francis Mayega", "Oyer Emmanuel", "Daphine Kalule", "Isaac Tumwesigye",
        "Ssonko Micheal", "Kyakwahuliire Esher", "Daniel Oluka", "Helen Purposed",
        "Birungi Monica", "Ssemwanga Cyrus"
    ]
};

async function compare() {
    const { data: users, error } = await supabase.from('users').select('id, name');
    if (error) {
        console.error('Error fetching users:', error.message);
        return;
    }

    console.log(`Total Users in DB: ${users.length}`);

    const allMappedNames = Object.values(mappings).flat();

    console.log('\n--- MATCHING RESULTS ---');
    allMappedNames.forEach(targetName => {
        const matches = users.filter(u =>
            u.name.toLowerCase().trim().includes(targetName.toLowerCase().trim()) ||
            targetName.toLowerCase().trim().includes(u.name.toLowerCase().trim())
        );

        if (matches.length > 0) {
            console.log(`[MATCH] Target: "${targetName}" -> DB: ${matches.map(m => m.name).join(', ')}`);
        } else {
            console.log(`[MISS]  Target: "${targetName}" not found in DB`);
        }
    });

    console.log('\n--- UNMATCHED DB USERS ---');
    users.forEach(u => {
        const isMapped = allMappedNames.some(targetName =>
            u.name.toLowerCase().trim().includes(targetName.toLowerCase().trim()) ||
            targetName.toLowerCase().trim().includes(u.name.toLowerCase().trim())
        );
        if (!isMapped) {
            console.log(`DB User: "${u.name}" (Not in mapping)`);
        }
    });
}

compare();
