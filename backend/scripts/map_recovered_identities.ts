
// @ts-nocheck
import { supabase } from '../src/supabase';
import fs from 'fs';

const RECOVERED_PATH = 'd:/Manifest System/backend/scripts/s378_identities_recovered.json';

export const run = async () => {
    const recovered = JSON.parse(fs.readFileSync(RECOVERED_PATH, 'utf8'));
    console.log(`Loaded ${recovered.length} recovered identity entries.`);

    let mapped = 0;
    let unknown = 0;

    for (const entry of recovered) {
        if (entry.name === 'UNKNOWN') {
            unknown++;
            continue;
        }

        // Search Current DB for this name
        const { data } = await supabase.from('members').select('id, name').ilike('name', `%${entry.name}%`);
        if (data && data.length > 0) {
            mapped++;
            if (mapped < 10) {
                console.log(`MAPPING: Orphan ${entry.member_id} (${entry.name}) -> Survivor ${data[0].id} (${data[0].name})`);
            }
        }
    }

    console.log(`Summary: Mapped ${mapped}, Unknown ${unknown}, Unmatchable ${recovered.length - mapped - unknown}`);
    process.exit(0);
};

run();
