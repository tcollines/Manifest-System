
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- CHECKING next_gen_souls SCHEMA ---');

    // We can just try to select service_id and see what we get, or inspect types via RPC if available
    // OR we can try to filter by a UUID and see if it errors

    const { data, error } = await supabase
        .from('next_gen_souls')
        .select('service_id')
        .limit(1);

    if (error) {
        console.error("Error fetching:", error.message);
    } else {
        console.log("Sample Data:", data);
    }

    // Try a filter to infer type
    const testUUID = '00000000-0000-0000-0000-000000000000';
    const { error: uuidError } = await supabase
        .from('next_gen_souls')
        .select('*')
        .eq('service_id', testUUID);
    // If service_id is TEXT, this works (string = string).
    // If service_id is UUID, this works (uuid = uuid).
    // Wait, supabase client handles type conversion usually.

    // Better: check information schema via our helper or hack
    // Let's assume the error text = uuid came from the RPC execution.
}

checkSchema();
