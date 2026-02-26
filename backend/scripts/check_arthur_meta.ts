import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false }
});

async function checkArthurMeta() {
    const { data: arthur } = await supabase.from('members').select('id, name, created_at, joined_date, category').ilike('name', '%Mwondha Arthur%').single();
    console.log('Arthur Metadata:', arthur);
}

checkArthurMeta();
