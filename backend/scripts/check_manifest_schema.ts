
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Checking manifest_details Schema ---');

    // Check manifest_details
    const { data: details, error } = await supabase.from('manifest_details').select('*').limit(5);

    if (error) {
        console.error('Error fetching manifest_details:', error);
    } else {
        console.log(`Found ${details.length} records in manifest_details.`);
        if (details.length > 0) {
            console.log('Sample Record:', details[0]);
            console.log('ID Type:', typeof details[0].id);
            // Check if ID is a valid UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(details[0].id);
            console.log('Is ID a valid UUID?', isUUID);
        } else {
            console.log('manifest_details is empty.');
        }
    }

    // Check if other tables have manifest_id column
    const tables = ['members', 'users', 'ministry_events'];
    for (const table of tables) {
        const { data, error: tableError } = await supabase.from(table).select('manifest_id').limit(1);
        if (tableError) {
            console.log(`${table}: manifest_id column likely MISSING (Error: ${tableError.message})`);
        } else {
            console.log(`${table}: manifest_id column EXISTS.`);
        }
    }
}

checkSchema();
