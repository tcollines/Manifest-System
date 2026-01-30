
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''; // Use service key for admin access

if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentMembers() {
    console.log('Fetching last 10 members...');
    // Fetch last 10 members ordered by created_at (assuming user table has it) or id desc
    // Since we don't know if created_at exists on members, we'll try sorting by ID descending if they are time-based UUIDs or serials.
    // Actually, let's just fetch and see. Or assume `created_at` exists as it is standard.

    const { data, error } = await supabase
        .from('members')
        .select('id, name, category, joined_date, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching members:', error);
        return;
    }

    console.table(data);
}

checkRecentMembers();
