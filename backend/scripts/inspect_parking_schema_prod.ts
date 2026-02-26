
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('--- INSPECTING personal_vehicles SCHEMA ---');

    // Querying information_schema via RPC or raw sql is not direct, 
    // but some Supabase setups allow querying pg_catalog or information_schema tables if not restricted.
    // Let's try to query it directly. If it fails, we'll try another way.

    const { data: columns, error } = await supabase
        .from('information_schema.columns' as any)
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'personal_vehicles')
        .eq('table_schema', 'public');

    if (error) {
        console.log("Direct information_schema query failed. Trying experimental select.");
        // Sometimes you can just select one row and look at types more closely?
        // Let's try to check the RPCs if there is a 'get_schema' or similar.
    } else {
        console.table(columns);
    }

    // Try to see if there are any RLS policies
    const { data: policies, error: polError } = await supabase
        .from('pg_policies' as any)
        .select('*')
        .eq('schemaname', 'public')
        .eq('tablename', 'personal_vehicles');

    if (!polError) {
        console.log("Policies for personal_vehicles:");
        console.table(policies);
    }

    // Check if current_service_id_uuid is actually populated vs current_service_id
    const { data: countCheck } = await supabase
        .from('personal_vehicles')
        .select('current_service_id, current_service_id_uuid')
        .not('current_service_id', 'is', null)
        .limit(5);

    console.log("Data sample for service IDs:");
    console.log(countCheck);
}

inspectSchema();
