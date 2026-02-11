
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalFix() {
    const { data: v } = await supabase.from('vehicles').select('id').limit(1).single();
    if (!v) return;
    const { error } = await supabase.from('passengers').update({ vehicle_id: v.id }).is('vehicle_id', null);
    if (error) console.error(error);
    else console.log('Final 2 passengers fixed.');
}

finalFix();
