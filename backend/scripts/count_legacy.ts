import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkCount() {
    // Use exact count
    const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .ilike('id', 'm-%');

    if (error) {
        console.error('Error counting:', error);
    } else {
        console.log(`Legacy IDs remaining (m-%): ${count}`);
    }
}

checkCount();
