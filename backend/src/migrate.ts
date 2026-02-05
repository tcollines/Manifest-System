
import { supabase } from './supabase';
import dotenv from 'dotenv';
dotenv.config();

console.log('--- STARTING COORDINATOR MIGRATION ---');

const INTER_SCHOOLS_UUID = '11324002-c401-494b-be68-179650967970';
const NIGHT_OF_PRAYER_UUID = 'bde9329f-2746-40b1-b2eb-56f2fcf028ee';

const mappings: Record<string, string[]> = {
    [INTER_SCHOOLS_UUID]: [
        "Aloysius Ojire",
        "Lukodda Joseph",
        "Jerry Kyobe",
        "Mugasha Isaac",
        "Helen Purpose",
        "Dorah Mwenyango",
        "Fredrick Balidawa",
        "Silas Ssemwanga",
        "Mwondha Arthur",
        "Birungi Monicah",
        "Kyobugira Betty",
        "Namara Angel",
        "Anitah Tukei",
        "Ben Kutosi"
    ],
    [NIGHT_OF_PRAYER_UUID]: [
        "Sarah Night",
        "Francis Mayega",
        "Oyer Emmanuel",
        "Daphine Kalule",
        "Isaac Tumwesigye",
        "Ssonko Micheal",
        "Kyakwahuliire Esher",
        "Daniel Oluka",
        "Helen Purposed",
        "Birungi Monica",
        "Ssemwanga Cyrus"
    ]
};

async function migrate() {
    try {
        const { data: users, error } = await supabase.from('users').select('id, name');
        if (error) throw error;
        if (!users) return;

        console.log(`Auditing ${users.length} users...`);

        for (const [eventId, names] of Object.entries(mappings)) {
            console.log(`\nProcessing Event: ${eventId}`);
            for (const targetName of names) {
                const user = users.find(u =>
                    u.name.toLowerCase().trim().includes(targetName.toLowerCase().trim()) ||
                    targetName.toLowerCase().trim().includes(u.name.toLowerCase().trim())
                );

                if (user) {
                    console.log(`Updating ${user.name} (${user.id}) -> ${eventId}`);
                    const { error: uErr } = await supabase
                        .from('users')
                        .update({ event_id: eventId })
                        .eq('id', user.id);

                    if (uErr) console.error(`Error updating ${user.name}:`, uErr.message);
                } else {
                    console.log(`User NOT FOUND for: ${targetName}`);
                }
            }
        }
        console.log('\nMigration Complete.');
    } catch (err: any) {
        console.error('Migration failed:', err.message);
    }
}

migrate();
