import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: resolveEnvPath(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const inspectDuplicates = async () => {
    console.log("--- INSPECTING DUPLICATES ---");

    // Fetch all members named 'John Doe'
    const { data: members, error } = await supabase
        .from('members')
        .select('id, name, phone, residency, category, status, created_at')
        .ilike('name', 'John Doe');

    if (error) {
        console.error("Error fetching members:", error);
        return;
    }

    console.log(`Found ${members?.length} records for 'John Doe':`);
    members?.forEach(m => {
        console.log(`ID: ${m.id}`);
        console.log(`   Name: ${JSON.stringify(m.name)}`);
        console.log(`   Phone: ${JSON.stringify(m.phone)}`);
        console.log(`   Residency: ${JSON.stringify(m.residency)}`);
        console.log(`   Category: ${m.category}`);
        console.log(`   Status: ${m.status}`);
        console.log('---');
    });
};

inspectDuplicates();
