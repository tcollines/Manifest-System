
import { supabase } from '../src/supabase';

async function inspectColumns() {
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'souls');

    if (error) {
        console.error('Error fetching columns:', error);
    } else {
        console.table(data);
    }
}

inspectColumns();
