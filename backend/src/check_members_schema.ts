
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/Manifest System/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMembersSchema() {
    console.log('Checking members table schema...');

    // We can't easily query information_schema via Supabase-js client directly unless we have a specific function exposed.
    // So we will try to inspect the types returned by a select.

    const { data, error } = await supabase
        .from('members')
        .select('check_in_time')
        .limit(1);

    if (error) {
        console.error('Error fetching members:', error);
        return;
    }

    if (data && data.length > 0) {
        const row = data[0];
        console.log('Sample Row:', row);
        console.log('Type of check_in_time value:', typeof row.check_in_time);
        console.log('Value of check_in_time:', row.check_in_time);
    } else {
        console.log('No members found to inspect, but query succeeded.');
    }
}

checkMembersSchema();
