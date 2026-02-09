import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function traceOrphans() {
    const orphans = [
        '44ae078e-5f12-495c-87d8-3c9e2c0f1a46', // Sample from previous output
        '0989adcb-4034-477d-3c9e2c0f1a46'
    ];

    console.log('Tracing sample orphans:', orphans);

    // 1. Check if they were "New IDs" in migration_mapping.json
    const mappingPath = path.join(__dirname, '../migration_mapping.json');
    if (fs.existsSync(mappingPath)) {
        const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
        const reverseMapping: Record<string, string> = {};
        Object.entries(mapping).forEach(([oldId, newId]) => {
            reverseMapping[newId as string] = oldId;
        });

        orphans.forEach(id => {
            if (reverseMapping[id]) {
                console.log(`- ${id} was migrated from legacy ID: ${reverseMapping[id]}`);
            } else {
                console.log(`- ${id} not found in migration_mapping.json`);
            }
        });
    }

    // 2. Check if they exist in legacy_id column? 
    // (Unlikely, usually legacy_id is the string 'm-...')

    // 3. Search for members with same name/phone as the attendance record?
    // We don't have name/phone in attendance table.

    // 4. BIG QUESTION: Why are there 713 orphans? 
    // Did "Global Dedupe Merge" delete them?
    // Let's check if these IDs were in a "duplicate group" that was deleted.
}

traceOrphans();
