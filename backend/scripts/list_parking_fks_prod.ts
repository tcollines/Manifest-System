
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listForeignKeys() {
    console.log('--- LISTING FOREIGN KEYS ON personal_vehicles ---');

    // We can query pg_constraint
    const { data: constraints, error } = await supabase
        .from('pg_constraint' as any)
        .select(`
            conname,
            contype,
            pg_class!inner (
                relname
            )
        `)
        .eq('pg_class.relname', 'personal_vehicles');

    if (error) {
        console.error("Error fetching constraints:", error.message);
    } else {
        console.log("Constraints found:");
        console.table(constraints);
    }

    // Also check the column types one more time, very specifically
    const { data: typeCheck } = await supabase.rpc('get_table_info', { table_name: 'personal_vehicles' });
    if (typeCheck) {
        console.log("Detailed Table Info (via potential RPC):");
        console.log(typeCheck);
    } else {
        // Fallback: try to see if we can get anything from a select with a system function
        const { data: types } = await supabase.from('personal_vehicles').select('id, current_service_id, current_service_id_uuid').limit(1);
        if (types && types.length > 0) {
            // We can't see types here, but we can see the data
            console.log("Sample Data Types (Observation):");
            console.log(types[0]);
        }
    }
}

listForeignKeys();
