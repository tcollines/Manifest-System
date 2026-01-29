
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectChildren() {
    console.log('--- Recent Children Records ---');
    // Fetch last 10 children, assuming 'created_at' exists or we rely on insertion order?
    // Children table doesn't have created_at in my previous schema view!
    // It has `joined_date`. Let's sort by that or just take any.
    // Actually, `id` is a string `c-${Date.now()}`, so we can sort by ID desc if it's timestamp based!

    // Sort by ID descending (since our ID format `c-TIMESTAMP` allows rough chronological sorting)
    const { data, error } = await supabase
        .from('children')
        .select('id, name, category, status, joined_date, attended_service_ids')
        .order('id', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching children:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

inspectChildren();
