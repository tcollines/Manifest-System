import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function inspectSurvivors() {
    const { data: survivors } = await supabase.from('members').select('id, name, created_at, joined_date').order('created_at', { ascending: false });
    console.log('Total Survivors:', survivors?.length);
    console.log('Samples:', survivors?.slice(0, 10));
}

inspectSurvivors();
