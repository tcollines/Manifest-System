
import { supabase } from './src/supabase';

async function inspectSchema() {
    try {
        // Query to get column details from information_schema
        const { data, error } = await supabase
            .rpc('get_table_info', { table_name: 'children' });

        // If RPC doesn't exist (likely), try raw query if possible or just fetch one row
        if (error) {
            console.log("RPC get_table_info failed, trying fetch single row to see keys...");
            const { data: rows, error: fetchError } = await supabase.from('children').select('*').limit(1);
            if (fetchError) {
                console.error("Error fetching children:", fetchError);
            } else {
                if (rows && rows.length > 0) {
                    console.log("Existing Columns in 'children' table:", Object.keys(rows[0]));
                } else {
                    console.log("Table 'children' is empty, cannot infer columns from data.");
                }
            }
        } else {
            console.log("Schema:", data);
        }

    } catch (e) {
        console.error(e);
    }
}

inspectSchema();
