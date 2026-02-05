
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const INTER_SCHOOLS_UUID = '11324002-c401-494b-be68-179650967970';
const NIGHT_OF_PRAYER_UUID = 'bde9329f-2746-40b1-b2eb-56f2fcf028ee';

const mappings = {
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
        "Namara Angel", // From users list
        "Anitah Tukei", // From users list
        "Ben Kutosi"   // From users list
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
        "Ssemwanga Cyrus",
        "Mwondha Arthur" // Some might be in both, but usually one
    ]
};

async function migrate() {
    try {
        const { data: users, error } = await supabase.from('users').select('id, name');
        if (error) throw error;

        console.log(`Auditing ${users.length} users...`);

        for (const [eventId, names] of Object.entries(mappings)) {
            console.log(`\nProcessing Event: ${eventId}`);
            for (const targetName of names) {
                // Find matching user (fuzzy name match)
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
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
}

migrate();
