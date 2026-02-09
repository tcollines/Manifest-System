
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSourceTypes() {
    console.log("Checking distinct source_type values in souls table...");

    const { data, error } = await supabase
        .from('souls')
        .select('source_type');

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    // Manual distinct count since Supabase JS select distinct is a bit verbose with simple syntax
    const distinctTypes = [...new Set(data.map((r: any) => r.source_type))];
    console.log("Distinct Source Types:", distinctTypes);

    // Also check if there are any records with missing source_id
    const { count, error: countError } = await supabase
        .from('souls')
        .select('*', { count: 'exact', head: true })
        .is('source_id', null);

    if (countError) console.error("Error checking null source_id:", countError.message);
    else console.log(`Records with NULL source_id: ${count}`);
}

checkSourceTypes();
